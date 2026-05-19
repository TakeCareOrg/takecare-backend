/**
 * Internal DTOs for the Withings integration.
 *
 * Mirrors the shape the app expects (`HealthData` slice on the React Native
 * side) plus a few extras for body composition and vitals that don't have a
 * Health Connect counterpart.
 *
 * The Withings API itself is documented at https://developer.withings.com/api-reference;
 * raw responses are mapped to the types in this file by `src/services/withings/mapper.ts`.
 */

export type WithingsMeasurementType =
    | "weight"
    | "fat_mass"
    | "muscle_mass"
    | "bmi"
    | "hr"
    | "hrv"
    | "spo2"
    | "bp_systolic"
    | "bp_diastolic"
    | "steps"
    | "distance"
    | "calories"
    | "sleep_session";

export interface BasesHealthValue {
    value: number;
    /** ISO 8601 string (UTC). */
    startDate: string;
    endDate: string;
}

export type HeartRateValue = BasesHealthValue;

export interface SleepStage {
    /** iOS-style integer code: 1=sleep, 2=awake, 3=light, 4=deep, 5=REM, 0=out_of_bed */
    type: string;
    startTime: string;
    endTime: string;
    /** seconds */
    duration: number;
}

export interface SleepSessionData {
    startDate: string;
    endDate: string;
    /** seconds of actual sleep (excluding awake/out_of_bed) */
    duration: number;
    stages?: SleepStage[];
    /** Withings sleep score (0–100) when available */
    score?: number;
}

/**
 * Top-level slice the app receives from `GET /withings/data`. Keys are
 * deliberately aligned with the app's `HealthData` type so the merge in
 * `health-sync.ts` is a shallow spread.
 */
export interface WithingsHealthSlice {
    connected: boolean;
    heartRate?: {
        lastHeartRateValue: HeartRateValue | null;
        values: HeartRateValue[];
    };
    sleepAnalysis?: {
        totalSleepValue: SleepSessionData | null;
        sleepSteps: SleepSessionData[];
    };
    steps?: BasesHealthValue[];
    distance?: BasesHealthValue[];
    activeEnergyBurned?: BasesHealthValue[];
    bodyComposition?: {
        weight?: BasesHealthValue[];
        fatMass?: BasesHealthValue[];
        muscleMass?: BasesHealthValue[];
        bmi?: BasesHealthValue[];
    };
    vitals?: {
        spo2?: BasesHealthValue[];
        hrv?: BasesHealthValue[];
        bloodPressure?: {
            systolic: BasesHealthValue[];
            diastolic: BasesHealthValue[];
        };
    };
}

/**
 * The OAuth2 token bundle Withings returns from `/v2/oauth2`. Only the
 * fields we actually use — Withings's response carries extras (token_type,
 * scope echo, csrf_token) that we ignore.
 */
export interface WithingsTokenBundle {
    /** Withings's own user id. We persist this so we can look up the local user when a webhook lands. */
    userid: string;
    access_token: string;
    refresh_token: string;
    /** seconds until expiry */
    expires_in: number;
    /** CSV of granted scopes */
    scope: string;
}

/**
 * Status payload returned by `GET /withings/status`. Mirror the app's
 * `useWithingsStore` shape so the client doesn't have to remap.
 */
export interface WithingsStatusPayload {
    connected: boolean;
    connected_at?: string;
    last_synced_at?: string;
    subscribed_applis?: number[];
}

/**
 * Validated webhook body (after zod parsing). Withings sends
 * `application/x-www-form-urlencoded` with numeric strings, so the
 * validator parses to numbers here for downstream convenience.
 */
export interface WithingsWebhookPayload {
    userid: string;
    appli: number;
    /** Unix seconds */
    startdate: number;
    /** Unix seconds */
    enddate: number;
}
