import mongo, { Schema } from "mongoose";
import type { WithingsMeasurementType } from "@dtypes/withings";

/**
 * Mongoose schemas for the Withings integration. Three collections:
 *
 *   1. `Withings_Accounts` — one row per connected user. Tokens encrypted
 *      via Vault transit (key "withings-tokens", context = user_id).
 *   2. `Withings_Measurements` — append-only cache of normalised samples
 *      the app reads via `GET /withings/data`. Encrypted via the existing
 *      "health-data" transit key (context = user_id) so the encryption-at-
 *      rest model stays consistent with `UserHealthAttributionsDB`.
 *   3. `Withings_Webhook_Events` — idempotency log; deduplicates Withings
 *      retries and lets a sweeper job pick up deferred events when we hit
 *      the per-user rate limit.
 *
 * Single-instance assumption: the token-refresh and rate-limit sweeper
 * jobs use `setInterval` (no queue infra). When the deployment goes
 * multi-instance, gate those jobs behind a Mongo TTL lock — see the
 * plan's Risks section.
 */

export interface WithingsAccount {
    user_id: string;
    withings_user_id: string;
    access_token: string; // encrypted
    refresh_token: string; // encrypted
    scope: string;
    access_token_expires_at: Date;
    subscribed_applis: number[];
    connected_at: Date;
    last_refreshed_at: Date;
    last_webhook_at?: Date;
    disconnected_at?: Date;
}

const withingsAccountSchema = new Schema<WithingsAccount>({
    user_id: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    withings_user_id: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    access_token: {
        type: String,
        required: true,
    },
    refresh_token: {
        type: String,
        required: true,
    },
    scope: {
        type: String,
        required: true,
        default: "",
    },
    access_token_expires_at: {
        type: Date,
        required: true,
    },
    subscribed_applis: {
        type: [Number],
        default: [],
    },
    connected_at: {
        type: Date,
        default: Date.now,
        required: true,
    },
    last_refreshed_at: {
        type: Date,
        default: Date.now,
        required: true,
    },
    last_webhook_at: {
        type: Date,
        required: false,
    },
    disconnected_at: {
        type: Date,
        required: false,
        index: true,
    },
});

export interface WithingsMeasurement {
    user_id: string;
    type: WithingsMeasurementType;
    /**
     * Encrypted JSON string. After decryption:
     *   scalars  → { value: number, unit: string }
     *   sleep    → SleepSessionData (see types/withings.ts)
     */
    value: string;
    /** For sleep sessions this is the session's endDate. */
    measured_at: Date;
    ingested_at: Date;
    source: "withings";
    /** Original Withings meastype, kept for debugging only. */
    raw_meastype?: number;
}

const withingsMeasurementSchema = new Schema<WithingsMeasurement>({
    user_id: {
        type: String,
        required: true,
        index: true,
    },
    type: {
        type: String,
        required: true,
    },
    value: {
        type: String,
        required: true,
    },
    measured_at: {
        type: Date,
        required: true,
    },
    ingested_at: {
        type: Date,
        default: Date.now,
        required: true,
    },
    source: {
        type: String,
        default: "withings",
        required: true,
    },
    raw_meastype: {
        type: Number,
        required: false,
    },
});

// Compound index covering the `GET /withings/data?start&end&types=...`
// access pattern (user_id + type + measured_at desc). Also enforces
// idempotency on writes: re-receiving the same measurement (same user
// + type + timestamp) collides on this index when we upsert.
withingsMeasurementSchema.index(
    { user_id: 1, type: 1, measured_at: -1 },
    { unique: true },
);

export interface WithingsWebhookEvent {
    withings_user_id: string;
    appli: number;
    startdate: number; // unix seconds
    enddate: number; // unix seconds
    received_at: Date;
    processed: boolean;
    processed_at?: Date;
    error?: string;
}

const withingsWebhookEventSchema = new Schema<WithingsWebhookEvent>({
    withings_user_id: {
        type: String,
        required: true,
    },
    appli: {
        type: Number,
        required: true,
    },
    startdate: {
        type: Number,
        required: true,
    },
    enddate: {
        type: Number,
        required: true,
    },
    received_at: {
        type: Date,
        default: Date.now,
        required: true,
    },
    processed: {
        type: Boolean,
        default: false,
        required: true,
        index: true,
    },
    processed_at: {
        type: Date,
        required: false,
    },
    error: {
        type: String,
        required: false,
    },
});

// Idempotency guarantee: same (user, appli, window) → same row. Withings
// retries 5xx aggressively, this stops us double-processing.
withingsWebhookEventSchema.index(
    { withings_user_id: 1, appli: 1, startdate: 1, enddate: 1 },
    { unique: true },
);

// TTL — webhook event rows are an operational log, no point keeping
// forever. 7 days is plenty for retry windows and post-mortems.
withingsWebhookEventSchema.index(
    { received_at: 1 },
    { expireAfterSeconds: 7 * 24 * 60 * 60 },
);

export const WithingsAccountDB = mongo.model<WithingsAccount>(
    "Withings_Account",
    withingsAccountSchema,
);
export const WithingsMeasurementsDB = mongo.model<WithingsMeasurement>(
    "Withings_Measurement",
    withingsMeasurementSchema,
);
export const WithingsWebhookEventDB = mongo.model<WithingsWebhookEvent>(
    "Withings_Webhook_Event",
    withingsWebhookEventSchema,
);
