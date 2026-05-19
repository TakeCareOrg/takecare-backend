import Logger from "@libs/logger";
import { WithingsAccountDB } from "@database/models/withings";
import { refreshAndPersist } from "@services/withings";
import { WithingsWebhookEventDB } from "@database/models/withings";
import Withings from "@models/withings/withings";
import { processWebhookEvent } from "@controllers/withings";

/**
 * Background tasks for the Withings integration.
 *
 * Two responsibilities folded into one `setInterval`:
 *
 *   1. **Token refresh sweeper** (every 30 min): pre-emptively refresh
 *      access tokens that are <45 min from expiry. This means even a
 *      user who hasn't opened the app for a week still has a fresh
 *      access token when their next webhook lands — the
 *      `withFreshToken` wrapper would also handle it on-demand, but
 *      doing it ahead of time avoids latency on the critical webhook
 *      path.
 *
 *   2. **Deferred webhook sweeper** (every 30 min): re-process
 *      `WithingsWebhookEventDB` rows that were marked `processed: false`
 *      because the per-user rate budget was exhausted at the time they
 *      arrived.
 *
 * Both run on `setInterval` because the backend has no queue system.
 * Single-instance assumption documented in the plan (Risks §1).
 */

const REFRESH_LOOK_AHEAD_MS = 45 * 60 * 1000;
const SWEEPER_INTERVAL_MS = 30 * 60 * 1000;
let timer: ReturnType<typeof setInterval> | null = null;

async function refreshExpiringTokens(): Promise<void> {
    const cutoff = new Date(Date.now() + REFRESH_LOOK_AHEAD_MS);
    const expiringSoon = await WithingsAccountDB.find({
        disconnected_at: { $exists: false },
        access_token_expires_at: { $lt: cutoff },
    });

    for (const account of expiringSoon) {
        try {
            await refreshAndPersist(account.user_id);
        } catch (error) {
            Logger.error(
                `Withings refresh sweeper: failed for user ${account.user_id}`,
                error,
            );
        }
    }
}

async function retryDeferredWebhooks(): Promise<void> {
    // Take a small batch on each tick — 25 is enough to drain a busy
    // user's hour without blowing the next interval.
    const deferred = await WithingsWebhookEventDB.find({
        processed: false,
    })
        .sort({ received_at: 1 })
        .limit(25);

    for (const event of deferred) {
        const account = await WithingsAccountDB.findOne({
            withings_user_id: event.withings_user_id,
            disconnected_at: { $exists: false },
        });
        if (!account) {
            // Account vanished mid-flight (disconnect). Mark processed
            // with an explanatory note so it stops cycling.
            await WithingsWebhookEventDB.updateOne(
                { _id: event._id },
                {
                    $set: {
                        processed: true,
                        processed_at: new Date(),
                        error: "Account no longer active",
                    },
                },
            );
            continue;
        }

        try {
            await processWebhookEvent({
                userId: account.user_id,
                withingsUserId: event.withings_user_id,
                appli: event.appli,
                startdate: event.startdate,
                enddate: event.enddate,
            });
            await WithingsWebhookEventDB.updateOne(
                { _id: event._id },
                {
                    $set: {
                        processed: true,
                        processed_at: new Date(),
                    },
                },
            );
        } catch (error) {
            Logger.error(
                `Withings deferred webhook retry failed for user ${account.user_id}`,
                error,
            );
            // Leave processed=false so we try again next tick.
        }
    }
}

export function startWithingsJobs(): void {
    if (timer) return;
    Logger.info("Starting Withings background jobs (refresh + sweeper)");
    timer = setInterval(async () => {
        try {
            await refreshExpiringTokens();
        } catch (error) {
            Logger.error("Withings refresh sweeper top-level error", error);
        }
        try {
            await retryDeferredWebhooks();
        } catch (error) {
            Logger.error("Withings webhook sweeper top-level error", error);
        }
    }, SWEEPER_INTERVAL_MS);
}

export function stopWithingsJobs(): void {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

// Re-export the default symbol so we don't trip the linter on the
// `Withings` import — actually we use it indirectly via
// processWebhookEvent. Keep this hint to remind reviewers the model is
// loaded for side effects.
export type WithingsModel = typeof Withings;
// Avoid TS marking the import as unused — referenced by the type alias above.
void Withings;
