import { Request, Response } from "express";
import Logger from "@libs/logger";
import { RequestMiddleware } from "@dtypes/express";
import {
    WithingsAccountDB,
    WithingsWebhookEventDB,
} from "@database/models/withings";
import { WITHINGS_APPLI, WITHINGS_MEASTYPE } from "@constants/withings";
import {
    withingsCallbackQuerySchema,
    withingsDataQuerySchema,
    withingsWebhookSchema,
} from "@validators/withings";
import {
    getActivity,
    getMeasures,
    getSleepSummary,
    mapRawActivity,
    mapRawMeasureGroups,
    mapRawSleepSummaries,
    tryAcquireRateSlot,
    releaseRateSlot,
    withFreshToken,
    ymd,
    type MappedMeasurement,
} from "@services/withings";
import Withings from "@models/withings/withings";
import type { WithingsMeasurementType } from "@dtypes/withings";

/**
 * HTTP handlers for the Withings integration. The actual business
 * logic lives in `@models/withings/withings` and `@services/withings/*`
 * — this layer is just Express plumbing + input parsing + response
 * shaping.
 */

// ────────────────────────────────────────────────────────────────────
// Authenticated handlers (JWT required upstream via authMiddleware)
// ────────────────────────────────────────────────────────────────────

export const getStatus: RequestMiddleware = async (req, res) => {
    const userId = req.user?.user_id;
    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        const instance = new Withings(userId);
        const status = await instance.getStatus();
        res.json(status);
    } catch (error) {
        Logger.error("withings/status failed", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const initConnect: RequestMiddleware = async (req, res) => {
    const userId = req.user?.user_id;
    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        const instance = new Withings(userId);
        const payload = instance.initiateConnect();
        res.json(payload);
    } catch (error) {
        // `getWithingsSecrets` in oauth.ts throws an Error whose message
        // starts with "WITHINGS_NOT_CONFIGURED:" followed by detail; use a
        // prefix match so any future wording change still hits this branch.
        if (
            error instanceof Error &&
            error.message.startsWith("WITHINGS_NOT_CONFIGURED")
        ) {
            res.status(503).json({
                message:
                    "Withings integration is not configured on this deployment",
            });
            return;
        }
        Logger.error("withings/oauth/init failed", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getData: RequestMiddleware = async (req, res) => {
    const userId = req.user?.user_id;
    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    const parsed = withingsDataQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        res.status(400).json({
            message: "Invalid query",
            issues: parsed.error.issues,
        });
        return;
    }

    try {
        const start = new Date(parsed.data.start);
        const end = new Date(parsed.data.end);
        const types = parsed.data.types
            ?.split(",")
            .map((t) => t.trim())
            .filter((t): t is WithingsMeasurementType => t.length > 0) as
            | WithingsMeasurementType[]
            | undefined;

        const instance = new Withings(userId);
        const slice = await instance.getData({ start, end, types });
        res.json(slice);
    } catch (error) {
        Logger.error("withings/data failed", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const disconnect: RequestMiddleware = async (req, res) => {
    const userId = req.user?.user_id;
    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        const instance = new Withings(userId);
        await instance.disconnect();
        res.status(204).end();
    } catch (error) {
        Logger.error("withings/disconnect failed", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ────────────────────────────────────────────────────────────────────
// Public handlers (no JWT) — OAuth callback + webhook
// ────────────────────────────────────────────────────────────────────

/**
 * Build the final mobile deep-link the user is redirected to once the
 * OAuth dance is done. Status is encoded as `?status=success|error`
 * with an optional `&message=...`.
 */
function deepLinkBack({
    status,
    message,
}: {
    status: "success" | "error";
    message?: string;
}): string {
    const url = new URL("app-scheme://withings/callback");
    url.searchParams.set("status", status);
    if (message) url.searchParams.set("message", message);
    return url.toString();
}

/** GET /withings/oauth/callback (public — Withings 302s here) */
export async function handleOAuthCallback(
    req: Request,
    res: Response,
): Promise<void> {
    const parsed = withingsCallbackQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        res.redirect(
            deepLinkBack({ status: "error", message: "invalid_callback" }),
        );
        return;
    }
    const { code, state, error: withingsError } = parsed.data;
    if (withingsError) {
        res.redirect(deepLinkBack({ status: "error", message: withingsError }));
        return;
    }

    try {
        await Withings.handleCallback({ code, state });
        res.redirect(deepLinkBack({ status: "success" }));
    } catch (error) {
        Logger.error("Withings OAuth callback failed", error);
        const message =
            error instanceof Error ? error.message : "callback_failed";
        res.redirect(deepLinkBack({ status: "error", message }));
    }
}

/** POST /withings/webhook (public — Withings NotifyAPI posts here) */
export async function handleWebhook(
    req: Request,
    res: Response,
): Promise<void> {
    // Withings does a HEAD/POST verification ping on subscribe — we
    // respond 200 to anything we don't understand so the subscription
    // succeeds.
    const parsed = withingsWebhookSchema.safeParse(req.body);
    if (!parsed.success) {
        Logger.warn("Withings webhook: payload did not validate", {
            issues: parsed.error.issues,
        });
        res.status(200).end();
        return;
    }
    const { userid, appli, startdate, enddate } = parsed.data;

    const account = await WithingsAccountDB.findOne({
        withings_user_id: userid,
        disconnected_at: { $exists: false },
    });
    if (!account) {
        // Unknown user — possibly a stale Withings subscription. Drop
        // silently so Withings doesn't retry.
        res.status(200).end();
        return;
    }

    // Idempotency upsert. If the row already exists we short-circuit.
    let isFreshEvent = false;
    try {
        const result = await WithingsWebhookEventDB.findOneAndUpdate(
            { withings_user_id: userid, appli, startdate, enddate },
            {
                $setOnInsert: {
                    withings_user_id: userid,
                    appli,
                    startdate,
                    enddate,
                    received_at: new Date(),
                    processed: false,
                },
            },
            { upsert: true, includeResultMetadata: true },
        );
        // `result.lastErrorObject?.updatedExisting === false` ⇒ we
        // inserted a brand-new row. `true` ⇒ duplicate.
        isFreshEvent = result.lastErrorObject?.updatedExisting === false;
    } catch (error) {
        Logger.error("Withings webhook: idempotency upsert failed", error);
        // Bail with 200 — Withings would otherwise retry forever on 5xx.
        res.status(200).end();
        return;
    }

    // Always respond 200 before doing the heavy fetch. Withings has a
    // tight timeout on webhook responses and we don't want to hold the
    // connection open.
    res.status(200).end();

    if (!isFreshEvent) {
        return;
    }

    // Rate-limit gate — if we'd blow the user's budget, leave the
    // event marked `processed: false` for the sweeper to retry later.
    if (!tryAcquireRateSlot(account.user_id)) {
        Logger.warn(
            `Withings webhook deferred (rate limit) user=${account.user_id} appli=${appli}`,
        );
        return;
    }

    try {
        await processWebhookEvent({
            userId: account.user_id,
            withingsUserId: userid,
            appli,
            startdate,
            enddate,
        });
        await WithingsWebhookEventDB.updateOne(
            { withings_user_id: userid, appli, startdate, enddate },
            { $set: { processed: true, processed_at: new Date() } },
        );
    } catch (error) {
        releaseRateSlot(account.user_id);
        await WithingsWebhookEventDB.updateOne(
            { withings_user_id: userid, appli, startdate, enddate },
            {
                $set: {
                    processed: false,
                    error:
                        error instanceof Error ? error.message : String(error),
                },
            },
        );
        Logger.error(
            `Withings webhook processing failed user=${account.user_id} appli=${appli}`,
            error,
        );
    }
}

/**
 * Pure helper that the sweeper job also calls. Fetches the relevant
 * Withings endpoint based on `appli`, maps to our internal shape, and
 * upserts via the model.
 */
export async function processWebhookEvent({
    userId,
    appli,
    startdate,
    enddate,
}: {
    userId: string;
    withingsUserId: string;
    appli: number;
    startdate: number;
    enddate: number;
}): Promise<void> {
    let mapped: MappedMeasurement[] = [];

    switch (appli) {
        case WITHINGS_APPLI.WEIGHT: {
            mapped = await withFreshToken(userId, async (token) => {
                const groups = await getMeasures({
                    accessToken: token,
                    meastypes: [
                        WITHINGS_MEASTYPE.WEIGHT_KG,
                        WITHINGS_MEASTYPE.FAT_MASS_KG,
                        WITHINGS_MEASTYPE.FAT_RATIO_PCT,
                        WITHINGS_MEASTYPE.MUSCLE_MASS_KG,
                        WITHINGS_MEASTYPE.FAT_FREE_MASS_KG,
                    ],
                    startdate,
                    enddate,
                });
                return mapRawMeasureGroups(groups);
            });
            break;
        }
        case WITHINGS_APPLI.BLOOD_PRESSURE: {
            mapped = await withFreshToken(userId, async (token) => {
                const groups = await getMeasures({
                    accessToken: token,
                    meastypes: [
                        WITHINGS_MEASTYPE.BP_SYSTOLIC,
                        WITHINGS_MEASTYPE.BP_DIASTOLIC,
                    ],
                    startdate,
                    enddate,
                });
                return mapRawMeasureGroups(groups);
            });
            break;
        }
        case WITHINGS_APPLI.HEART_RATE: {
            mapped = await withFreshToken(userId, async (token) => {
                const groups = await getMeasures({
                    accessToken: token,
                    meastypes: [WITHINGS_MEASTYPE.HEART_PULSE],
                    startdate,
                    enddate,
                });
                return mapRawMeasureGroups(groups);
            });
            break;
        }
        case WITHINGS_APPLI.SPO2: {
            mapped = await withFreshToken(userId, async (token) => {
                const groups = await getMeasures({
                    accessToken: token,
                    meastypes: [WITHINGS_MEASTYPE.SPO2_PCT],
                    startdate,
                    enddate,
                });
                return mapRawMeasureGroups(groups);
            });
            break;
        }
        case WITHINGS_APPLI.ACTIVITY: {
            mapped = await withFreshToken(userId, async (token) => {
                const activities = await getActivity({
                    accessToken: token,
                    startdateymd: ymd(new Date(startdate * 1000)),
                    enddateymd: ymd(new Date(enddate * 1000)),
                });
                return mapRawActivity(activities);
            });
            break;
        }
        case WITHINGS_APPLI.SLEEP: {
            mapped = await withFreshToken(userId, async (token) => {
                const series = await getSleepSummary({
                    accessToken: token,
                    startdateymd: ymd(new Date(startdate * 1000)),
                    enddateymd: ymd(new Date(enddate * 1000)),
                });
                return mapRawSleepSummaries(series);
            });
            break;
        }
        default:
            Logger.warn(
                `Withings webhook: unknown appli=${appli}, skipping fetch`,
            );
            return;
    }

    if (mapped.length === 0) {
        Logger.info(
            `Withings webhook: no measurements returned for user=${userId} appli=${appli} window=${startdate}-${enddate}`,
        );
        return;
    }

    const instance = new Withings(userId);
    const { inserted, skipped } = await instance.upsertMeasurements(mapped);
    Logger.info(
        `Withings webhook processed user=${userId} appli=${appli} inserted=${inserted} skipped=${skipped}`,
    );
}

export default {
    getStatus,
    initConnect,
    getData,
    disconnect,
    handleOAuthCallback,
    handleWebhook,
    processWebhookEvent,
};
