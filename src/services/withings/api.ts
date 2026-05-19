import Logger from "@libs/logger";
import {
    WITHINGS_HTTP_TIMEOUT_MS,
    WITHINGS_MEASURE_ENDPOINT,
    WITHINGS_MEASURE_V2_ENDPOINT,
    WITHINGS_SLEEP_ENDPOINT,
} from "./constants";

/**
 * Thin Withings API client. We avoid adding axios as a dependency
 * because the backend already uses native `fetch` everywhere and the
 * Withings endpoints are simple form-urlencoded POSTs. Each function
 * here returns the raw `data` field of the Withings envelope — the
 * caller (mapper.ts) is responsible for normalisation.
 *
 * Withings's response envelope is always:
 *   { "status": 0, "body": {...} }           // success
 *   { "status": <non-zero>, "error": "..." } // failure
 *
 * `status === 401` (or sometimes 100/101 depending on endpoint) means
 * "access token rejected" — the caller should refresh and retry. We
 * surface that as a typed error so `oauth.ts:withFreshToken` can
 * detect it.
 */

/** Status codes Withings uses to signal "your access token is dead". */
const WITHINGS_AUTH_ERROR_STATUSES = new Set([100, 101, 401]);

export class WithingsAuthError extends Error {
    constructor(public status: number) {
        super(`Withings auth rejected (status=${status})`);
        this.name = "WithingsAuthError";
    }
}

export class WithingsApiError extends Error {
    constructor(
        public status: number,
        public withingsError: string | undefined,
        endpoint: string,
    ) {
        super(
            `Withings API ${endpoint} failed (status=${status}, error=${withingsError ?? "n/a"})`,
        );
        this.name = "WithingsApiError";
    }
}

interface WithingsEnvelope<T> {
    status: number;
    body?: T;
    error?: string;
}

/**
 * Wraps `fetch` with a timeout and Withings envelope unpacking. Adds the
 * `action` field that Withings expects on virtually every endpoint, and
 * authorises via Bearer header (the modern OAuth2 path — the older
 * URL-param form is no longer recommended).
 */
async function withingsPost<T>({
    endpoint,
    action,
    accessToken,
    params,
}: {
    endpoint: string;
    action: string;
    accessToken?: string;
    params?: Record<string, string | number | undefined>;
}): Promise<T> {
    const form = new URLSearchParams();
    form.set("action", action);
    if (params) {
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null) {
                form.set(key, String(value));
            }
        }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
        () => controller.abort(),
        WITHINGS_HTTP_TIMEOUT_MS,
    );

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                ...(accessToken
                    ? { Authorization: `Bearer ${accessToken}` }
                    : {}),
            },
            body: form.toString(),
            signal: controller.signal,
        });

        if (!response.ok) {
            // HTTP-level error (5xx, network). Withings own protocol errors
            // come back with HTTP 200 + a `status` field, handled below.
            throw new WithingsApiError(
                response.status,
                response.statusText,
                `${endpoint}/${action}`,
            );
        }

        const envelope = (await response.json()) as WithingsEnvelope<T>;
        if (envelope.status !== 0) {
            if (WITHINGS_AUTH_ERROR_STATUSES.has(envelope.status)) {
                throw new WithingsAuthError(envelope.status);
            }
            throw new WithingsApiError(
                envelope.status,
                envelope.error,
                `${endpoint}/${action}`,
            );
        }
        return (envelope.body ?? ({} as T)) as T;
    } finally {
        clearTimeout(timeoutId);
    }
}

/** Raw Withings types (just the fields we read). */
export interface RawMeasure {
    /** Withings's meastype: see WITHINGS_MEASTYPE constants. */
    type: number;
    /** value scaled by 10^unit, e.g. value=72_500 unit=-3 means 72.5 kg. */
    value: number;
    unit: number;
}
export interface RawMeasureGroup {
    grpid: number;
    /** Unix seconds — measurement time. */
    date: number;
    /** Unix seconds — creation in Withings's system. */
    created: number;
    measures: RawMeasure[];
}
export interface MeasureBodyResponse {
    measuregrps: RawMeasureGroup[];
}

/**
 * `meastypes` is a CSV of Withings meastype IDs. The Withings endpoint
 * accepts multiple in one call which keeps our rate-limit footprint down.
 */
export async function getMeasures({
    accessToken,
    meastypes,
    startdate,
    enddate,
}: {
    accessToken: string;
    meastypes: number[];
    startdate: number;
    enddate: number;
}): Promise<RawMeasureGroup[]> {
    const body = await withingsPost<MeasureBodyResponse>({
        endpoint: WITHINGS_MEASURE_ENDPOINT,
        action: "getmeas",
        accessToken,
        params: {
            meastypes: meastypes.join(","),
            startdate,
            enddate,
            category: 1, // 1 = real measurements (skip user-entered goals)
        },
    });
    return body.measuregrps ?? [];
}

export interface RawActivity {
    /** YYYY-MM-DD. */
    date: string;
    timezone: string;
    steps?: number;
    distance?: number;
    /** Active calories burned (kcal). */
    calories?: number;
    totalcalories?: number;
}
export interface ActivityBodyResponse {
    activities: RawActivity[];
}

export async function getActivity({
    accessToken,
    startdateymd,
    enddateymd,
}: {
    accessToken: string;
    startdateymd: string;
    enddateymd: string;
}): Promise<RawActivity[]> {
    const body = await withingsPost<ActivityBodyResponse>({
        endpoint: WITHINGS_MEASURE_V2_ENDPOINT,
        action: "getactivity",
        accessToken,
        params: {
            startdateymd,
            enddateymd,
            data_fields: "steps,distance,calories,totalcalories",
        },
    });
    return body.activities ?? [];
}

export interface RawSleepSummary {
    id: number;
    timezone: string;
    /** ISO date for the night (YYYY-MM-DD). */
    date: string;
    /** Unix seconds. */
    startdate: number;
    enddate: number;
    data?: {
        /** Total seconds asleep (light + deep + REM). */
        sleep_score?: number;
        durationtosleep?: number;
        durationtowakeup?: number;
        wakeupduration?: number;
        lightsleepduration?: number;
        deepsleepduration?: number;
        remsleepduration?: number;
        hr_average?: number;
        hr_min?: number;
        hr_max?: number;
        /** ms — Withings exposes nightly HRV via this field. */
        sleep_hr_variability?: number;
    };
}
export interface SleepSummaryBodyResponse {
    series: RawSleepSummary[];
}

export async function getSleepSummary({
    accessToken,
    startdateymd,
    enddateymd,
}: {
    accessToken: string;
    startdateymd: string;
    enddateymd: string;
}): Promise<RawSleepSummary[]> {
    const body = await withingsPost<SleepSummaryBodyResponse>({
        endpoint: WITHINGS_SLEEP_ENDPOINT,
        action: "getsummary",
        accessToken,
        params: {
            startdateymd,
            enddateymd,
            data_fields: [
                "sleep_score",
                "durationtosleep",
                "durationtowakeup",
                "wakeupduration",
                "lightsleepduration",
                "deepsleepduration",
                "remsleepduration",
                "hr_average",
                "hr_min",
                "hr_max",
                "sleep_hr_variability",
            ].join(","),
        },
    });
    return body.series ?? [];
}

/**
 * Helper for the OAuth/notify paths that don't need an access token but
 * still talk to Withings. Re-exported so `oauth.ts` and `notify.ts` can
 * share the timeout/error handling.
 */
export async function withingsPostPublic<T>(args: {
    endpoint: string;
    action: string;
    params?: Record<string, string | number | undefined>;
}): Promise<T> {
    try {
        return await withingsPost<T>(args);
    } catch (error) {
        Logger.error("Withings public POST failed", {
            endpoint: args.endpoint,
            action: args.action,
            error,
        });
        throw error;
    }
}

/** Re-export the typed POST helper for the modules that need it. */
export const withingsPostAuthenticated = withingsPost;
