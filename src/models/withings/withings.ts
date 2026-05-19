import Logger from "@libs/logger";
import VaultService from "@services/vault";
import { UserUpdatesDB } from "@database/models/user";
import {
    WithingsAccountDB,
    WithingsMeasurementsDB,
} from "@database/models/withings";
import {
    type DecryptedMeasurement,
    type MappedMeasurement,
    buildAuthorizeUrl,
    exchangeCode,
    groupMeasurementsToSlice,
    persistTokens,
    subscribeAllApplis,
    unsubscribeAllApplis,
    verifyState,
    WITHINGS_MEASUREMENT_KEY,
} from "@services/withings";
import type {
    WithingsHealthSlice,
    WithingsMeasurementType,
    WithingsStatusPayload,
} from "@dtypes/withings";

/**
 * Business-logic class for the Withings integration. Mirrors the
 * pattern in `src/models/user/user.ts`: one class per user, methods
 * orchestrate the underlying DB + service modules.
 *
 * Why a class instead of plain functions? Consistency with the rest of
 * the codebase + lets us inject a `user_id` once at construction and
 * reuse it across method calls without threading it through every
 * arg list.
 */

export default class Withings {
    public readonly user_id: string;

    constructor(user_id: string) {
        if (!user_id) throw new Error("USER_ID_REQUIRED");
        this.user_id = user_id;
    }

    /**
     * Returns the connection status the app reads at boot and after
     * the OAuth deep-link reopens the app. Cheap (single Mongo
     * findOne) — safe to call on every foreground transition.
     */
    async getStatus(): Promise<WithingsStatusPayload> {
        const account = await WithingsAccountDB.findOne({
            user_id: this.user_id,
            disconnected_at: { $exists: false },
        });
        if (!account) return { connected: false };

        return {
            connected: true,
            connected_at: account.connected_at.toISOString(),
            last_synced_at: account.last_webhook_at?.toISOString(),
            subscribed_applis: account.subscribed_applis,
        };
    }

    /**
     * Step 2 of the OAuth flow: produce the authorize URL the app
     * opens in a browser. The returned `state` is a signed JWT that
     * binds the eventual callback to this user, so we can recover
     * `user_id` from an unauthenticated request.
     */
    initiateConnect(): { authorize_url: string; state: string } {
        return buildAuthorizeUrl(this.user_id);
    }

    /**
     * Step 4 of the OAuth flow: callback from Withings. Exchanges
     * `code` → tokens, persists, subscribes NotifyAPI, and records an
     * audit event. Returns the new status.
     *
     * **Important**: this method ignores `this.user_id` and uses the
     * value extracted from `state`. The constructor takes a user id
     * for symmetry with the other model classes, but callbacks come
     * in unauthenticated — the static helper `Withings.handleCallback`
     * below is the right entry point for those.
     */
    static async handleCallback({
        code,
        state,
    }: {
        code: string;
        state: string;
    }): Promise<{ user_id: string; status: WithingsStatusPayload }> {
        const userId = verifyState(state);
        const bundle = await exchangeCode(code);
        await persistTokens({ userId, bundle });
        const subscribedApplis = await subscribeAllApplis(userId);

        // Re-persist with the subscription list so it's atomically
        // recorded alongside the token bundle.
        await WithingsAccountDB.updateOne(
            { user_id: userId },
            { $set: { subscribed_applis: subscribedApplis } },
        );

        await UserUpdatesDB.create({
            user_id: userId,
            type: "withings_connected",
            updated_at: new Date(),
        });

        Logger.info(
            `Withings connected for user ${userId} (applis=${subscribedApplis.join(",")})`,
        );

        const instance = new Withings(userId);
        return { user_id: userId, status: await instance.getStatus() };
    }

    /**
     * Disconnect: best-effort Withings unsubscribe, soft-delete the
     * local account row, record an audit event. Does **not** delete
     * the user's measurement history (`WithingsMeasurementsDB`) —
     * that's intentional, see plan §6.
     */
    async disconnect(): Promise<void> {
        const account = await WithingsAccountDB.findOne({
            user_id: this.user_id,
        });
        if (!account || account.disconnected_at) {
            return;
        }

        await unsubscribeAllApplis(this.user_id, account.subscribed_applis);

        await WithingsAccountDB.updateOne(
            { user_id: this.user_id },
            { $set: { disconnected_at: new Date() } },
        );

        await UserUpdatesDB.create({
            user_id: this.user_id,
            type: "withings_disconnected",
            updated_at: new Date(),
        });

        Logger.info(`Withings disconnected for user ${this.user_id}`);
    }

    /**
     * Encrypt + upsert a batch of mapped measurements. Used by the
     * webhook controller after a successful Withings API fetch.
     *
     * Idempotent on `(user_id, type, measured_at)` via the compound
     * unique index — Withings retries don't double-insert.
     */
    async upsertMeasurements(
        measurements: MappedMeasurement[],
    ): Promise<{ inserted: number; skipped: number }> {
        if (measurements.length === 0) return { inserted: 0, skipped: 0 };

        let inserted = 0;
        let skipped = 0;

        for (const m of measurements) {
            try {
                const ciphertext = await VaultService.encrypt({
                    keyName: WITHINGS_MEASUREMENT_KEY,
                    plaintext: JSON.stringify(m.payload),
                    context: this.user_id,
                });

                const result = await WithingsMeasurementsDB.updateOne(
                    {
                        user_id: this.user_id,
                        type: m.type,
                        measured_at: m.measured_at,
                    },
                    {
                        $set: {
                            value: ciphertext,
                            raw_meastype: m.raw_meastype,
                        },
                        $setOnInsert: {
                            user_id: this.user_id,
                            type: m.type,
                            measured_at: m.measured_at,
                            ingested_at: new Date(),
                            source: "withings",
                        },
                    },
                    { upsert: true },
                );
                if (result.upsertedCount > 0) inserted += 1;
                else skipped += 1;
            } catch (error) {
                Logger.error(
                    `upsertMeasurements: failed to upsert ${m.type} for ${this.user_id}`,
                    error,
                );
            }
        }

        // Bump the account's `last_webhook_at` so the status payload
        // reflects recent ingestion.
        await WithingsAccountDB.updateOne(
            { user_id: this.user_id },
            { $set: { last_webhook_at: new Date() } },
        );

        if (inserted > 0) {
            await UserUpdatesDB.create({
                user_id: this.user_id,
                type: "withings_measurement",
                updated_at: new Date(),
            });
        }

        return { inserted, skipped };
    }

    /**
     * Read path: load measurements in the requested window, decrypt
     * in parallel, project to the app's `WithingsHealthSlice` shape.
     *
     * Type filter is an optional CSV (`?types=hr,steps,sleep_session`)
     * — empty means "all".
     */
    async getData({
        start,
        end,
        types,
    }: {
        start: Date;
        end: Date;
        types?: WithingsMeasurementType[];
    }): Promise<WithingsHealthSlice> {
        const account = await WithingsAccountDB.findOne({
            user_id: this.user_id,
            disconnected_at: { $exists: false },
        });

        const query: Record<string, unknown> = {
            user_id: this.user_id,
            measured_at: { $gte: start, $lte: end },
        };
        if (types && types.length > 0) {
            query.type = { $in: types };
        }

        const rows = await WithingsMeasurementsDB.find(query)
            .sort({ measured_at: 1 })
            .lean();

        const decrypted = await Promise.all(
            rows.map(async (row) => {
                try {
                    const plaintext = await VaultService.decrypt({
                        keyName: WITHINGS_MEASUREMENT_KEY,
                        ciphertext: row.value,
                        context: this.user_id,
                    });
                    return {
                        type: row.type,
                        payload: JSON.parse(plaintext),
                        measured_at: row.measured_at,
                        raw_meastype: row.raw_meastype,
                    } as DecryptedMeasurement;
                } catch (error) {
                    Logger.error(
                        `Failed to decrypt Withings measurement ${row._id} for ${this.user_id}`,
                        error,
                    );
                    return null;
                }
            }),
        );

        const valid = decrypted.filter(
            (m): m is DecryptedMeasurement => m !== null,
        );
        const slice = groupMeasurementsToSlice(valid);

        return {
            connected: !!account,
            ...slice,
        };
    }
}
