import { WithingsAccountDB } from "@database/models/withings";
import { WITHINGS_RATE_LIMIT_BUDGET } from "@constants/withings";

/**
 * Per-user, rolling-1-hour rate limiter for Withings outbound API
 * calls. Withings enforces ~120 calls/hour/user — we cap at
 * `WITHINGS_RATE_LIMIT_BUDGET` (100) to leave headroom for token
 * refresh, retries, and the data-endpoint cache miss.
 *
 * Counter storage is **in-memory only** for v1. That's acceptable
 * because:
 *
 *   - The backend runs single-instance (per the plan's documented
 *     deployment posture). Multi-instance would require Mongo-backed
 *     counters anyway, gated behind the same TTL lock as the refresh
 *     job.
 *   - A counter loss on process restart is harmless: we'd just allow a
 *     burst of webhook processing for a few minutes until the budget
 *     re-saturates. Withings still applies its own server-side limit
 *     as the hard ceiling.
 */

interface RateLimitState {
    /** Unix ms timestamps of calls in the rolling window. */
    timestamps: number[];
}

const ROLLING_WINDOW_MS = 60 * 60 * 1000;
const state = new Map<string, RateLimitState>();

function prune(s: RateLimitState, now: number): void {
    const cutoff = now - ROLLING_WINDOW_MS;
    // Cheap O(n) prune from the head — timestamps are append-only and
    // monotonically increasing within a user, so we can stop at the
    // first index >= cutoff.
    let firstFresh = 0;
    while (
        firstFresh < s.timestamps.length &&
        s.timestamps[firstFresh] < cutoff
    ) {
        firstFresh += 1;
    }
    if (firstFresh > 0) {
        s.timestamps.splice(0, firstFresh);
    }
}

/**
 * Attempt to claim a slot for the given user. Returns `true` if there
 * was budget remaining (and increments the counter), `false` if the
 * caller should defer. The caller is expected to mark its event as
 * `processed: false` and let the sweeper retry later.
 */
export function tryAcquire(userId: string): boolean {
    const now = Date.now();
    const s = state.get(userId) ?? { timestamps: [] };
    prune(s, now);
    if (s.timestamps.length >= WITHINGS_RATE_LIMIT_BUDGET) {
        return false;
    }
    s.timestamps.push(now);
    state.set(userId, s);
    return true;
}

/**
 * Inspector for diagnostics / admin endpoints. Returns the current
 * window usage. Doesn't mutate state.
 */
export function inspect(userId: string): {
    used: number;
    budget: number;
    resets_at?: Date;
} {
    const now = Date.now();
    const s = state.get(userId) ?? { timestamps: [] };
    prune(s, now);
    const used = s.timestamps.length;
    return {
        used,
        budget: WITHINGS_RATE_LIMIT_BUDGET,
        resets_at: s.timestamps[0]
            ? new Date(s.timestamps[0] + ROLLING_WINDOW_MS)
            : undefined,
    };
}

/**
 * Hand back a slot to the budget. Useful when a call fails so fast
 * that it wouldn't have counted against Withings's actual quota
 * (network error before the request left). Best-effort — drop the most
 * recently recorded timestamp.
 */
export function release(userId: string): void {
    const s = state.get(userId);
    if (!s) return;
    s.timestamps.pop();
}

/**
 * Reset the in-memory counter for a user — e.g. after disconnect, when
 * the budget no longer matters. Keeps memory bounded.
 */
export function forget(userId: string): void {
    state.delete(userId);
}

/**
 * Convenience for migrations and tests: also forgets users that have
 * been soft-disconnected. We pull their IDs from the DB rather than
 * scanning every key in the map.
 */
export async function forgetDisconnected(): Promise<void> {
    const disconnected = await WithingsAccountDB.find({
        disconnected_at: { $exists: true },
    }).select("user_id");
    for (const acc of disconnected) {
        forget(acc.user_id);
    }
}
