import type { WithingsMeasurementType } from "@dtypes/withings";

/**
 * Public constants for the Withings integration.
 *
 * Kept in `src/constants/` rather than `src/services/withings/constants.ts`
 * so other layers (validators, controllers) can reuse them without
 * importing service internals.
 */

/** Withings API base URL. Same host for OAuth, measure, notify, sleep. */
export const WITHINGS_API_BASE = "https://wbsapi.withings.net";

/** OAuth2 authorize endpoint (HTML page Withings serves to the user). */
export const WITHINGS_AUTHORIZE_URL =
    "https://account.withings.com/oauth2_user/authorize2";

/**
 * OAuth scopes we request. Withings expects **comma-separated** values
 * (not space-separated like most OAuth providers) — that's a documented
 * quirk: https://developer.withings.com/oauth2/.
 */
export const WITHINGS_SCOPES = [
    "user.info",
    "user.metrics",
    "user.activity",
    "user.sleepevents",
] as const;

/**
 * `appli` codes drive both the NotifyAPI subscription topology and the
 * webhook payload routing. See:
 * https://developer.withings.com/api-reference#tag/notify
 *
 * We subscribe to a focused subset (no Withings Health Mate-only types).
 */
export const WITHINGS_APPLI = {
    WEIGHT: 1,
    BLOOD_PRESSURE: 4,
    ACTIVITY: 16,
    SLEEP: 44,
    HEART_RATE: 50,
    SPO2: 54,
} as const;

export const WITHINGS_SUBSCRIBED_APPLIS: number[] =
    Object.values(WITHINGS_APPLI);

/**
 * Withings `meastype` (the per-sample classifier inside getmeas responses).
 * Only the ones we map; everything else gets dropped by the mapper.
 * Reference: https://developer.withings.com/api-reference/#tag/measure
 */
export const WITHINGS_MEASTYPE = {
    WEIGHT_KG: 1,
    FAT_FREE_MASS_KG: 5,
    FAT_RATIO_PCT: 6,
    FAT_MASS_KG: 8,
    BP_DIASTOLIC: 9,
    BP_SYSTOLIC: 10,
    HEART_PULSE: 11,
    SPO2_PCT: 54,
    MUSCLE_MASS_KG: 76,
} as const;

/**
 * Reverse lookup from Withings meastype to our internal type taxonomy.
 * The mapper uses this for the `/measure?action=getmeas` path; other
 * endpoints (activity, sleep) have their own mapping logic.
 */
export const MEASTYPE_TO_INTERNAL: Record<number, WithingsMeasurementType> = {
    [WITHINGS_MEASTYPE.WEIGHT_KG]: "weight",
    [WITHINGS_MEASTYPE.FAT_FREE_MASS_KG]: "muscle_mass",
    [WITHINGS_MEASTYPE.FAT_RATIO_PCT]: "fat_mass",
    [WITHINGS_MEASTYPE.FAT_MASS_KG]: "fat_mass",
    [WITHINGS_MEASTYPE.BP_DIASTOLIC]: "bp_diastolic",
    [WITHINGS_MEASTYPE.BP_SYSTOLIC]: "bp_systolic",
    [WITHINGS_MEASTYPE.HEART_PULSE]: "hr",
    [WITHINGS_MEASTYPE.SPO2_PCT]: "spo2",
    [WITHINGS_MEASTYPE.MUSCLE_MASS_KG]: "muscle_mass",
};

/**
 * Per-user rate limit Withings enforces. We never want to hit this
 * because it gets the integration temporarily blacklisted; defensive
 * budget of 100 leaves headroom for unexpected webhook bursts.
 */
export const WITHINGS_RATE_LIMIT_PER_HOUR = 120;
export const WITHINGS_RATE_LIMIT_BUDGET = 100;
