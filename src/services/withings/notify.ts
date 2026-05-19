import Logger from "@libs/logger";
import { getSecrets } from "@config/secrets";
import { WITHINGS_SUBSCRIBED_APPLIS } from "@constants/withings";
import { WITHINGS_NOTIFY_ENDPOINT } from "./constants";
import { WithingsAuthError, withingsPostAuthenticated } from "./api";
import { withFreshToken } from "./oauth";

/**
 * NotifyAPI subscription management.
 *
 * Withings's NotifyAPI is a per-(user, appli) registry: when a
 * measurement of a given `appli` lands, Withings POSTs `callbackurl`
 * with the measurement window. We subscribe once per type on connect,
 * and unsubscribe on disconnect.
 *
 * Withings does a verification roundtrip when you call `subscribe`:
 * they HEAD (or sometimes POST) the callback URL to confirm it's
 * reachable. Our `/withings/webhook` route therefore needs to respond
 * 200 to both verbs even when the payload is missing/malformed.
 */

function getWebhookUrl(): string {
    const secrets = getSecrets();
    if (!secrets.withings) {
        throw new Error("WITHINGS_NOT_CONFIGURED");
    }
    return secrets.withings.WITHINGS_WEBHOOK_URL;
}

/**
 * Subscribe a single appli for the given user. Idempotent on the
 * Withings side — calling subscribe twice on the same (user, appli,
 * callbackurl) is a no-op.
 */
async function subscribeAppli(
    accessToken: string,
    appli: number,
): Promise<void> {
    await withingsPostAuthenticated({
        endpoint: WITHINGS_NOTIFY_ENDPOINT,
        action: "subscribe",
        accessToken,
        params: {
            callbackurl: getWebhookUrl(),
            appli,
            comment: "takecare",
        },
    });
}

/**
 * Unsubscribe a single appli. Tolerates Withings rejecting (e.g. if the
 * subscription was already cleaned up server-side) — we proceed with
 * local soft-delete either way.
 */
async function unsubscribeAppli(
    accessToken: string,
    appli: number,
): Promise<void> {
    try {
        await withingsPostAuthenticated({
            endpoint: WITHINGS_NOTIFY_ENDPOINT,
            action: "revoke",
            accessToken,
            params: {
                callbackurl: getWebhookUrl(),
                appli,
            },
        });
    } catch (error) {
        if (error instanceof WithingsAuthError) {
            // Token already dead — Withings will GC the subscription on
            // their side. Not our problem.
            Logger.warn(
                `Withings unsubscribe(${appli}) hit auth error — ignoring`,
            );
            return;
        }
        Logger.warn(`Withings unsubscribe(${appli}) failed`, error);
    }
}

/**
 * Subscribe to every appli we care about. Called once from the OAuth
 * callback after persisting tokens.
 *
 * We loop sequentially with a 100ms gap to be polite — Withings doesn't
 * document a burst limit on the notify endpoint specifically, but the
 * global 120/h budget applies and we don't want to spend a tenth of it
 * on connect alone.
 */
export async function subscribeAllApplis(userId: string): Promise<number[]> {
    const subscribed: number[] = [];
    for (const appli of WITHINGS_SUBSCRIBED_APPLIS) {
        try {
            await withFreshToken(userId, (token) =>
                subscribeAppli(token, appli),
            );
            subscribed.push(appli);
            await sleep(100);
        } catch (error) {
            Logger.error(
                `Withings subscribe(${appli}) failed for user ${userId}`,
                error,
            );
            // Continue with the other applis — partial subscription is
            // still useful (e.g. weight works even if HR subscription
            // fails for a user who doesn't have access to that scope).
        }
    }
    return subscribed;
}

/**
 * Unsubscribe everything we previously subscribed for the user.
 * Best-effort: errors are logged but we always return so the disconnect
 * flow can continue with the local soft-delete.
 */
export async function unsubscribeAllApplis(
    userId: string,
    applis: number[],
): Promise<void> {
    for (const appli of applis) {
        try {
            await withFreshToken(userId, (token) =>
                unsubscribeAppli(token, appli),
            );
            await sleep(100);
        } catch (error) {
            Logger.warn(
                `Withings unsubscribe(${appli}) failed for user ${userId}`,
                error,
            );
        }
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
