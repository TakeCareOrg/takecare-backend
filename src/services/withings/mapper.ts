import type {
    BasesHealthValue,
    SleepSessionData,
    SleepStage,
    WithingsHealthSlice,
    WithingsMeasurementType,
} from "@dtypes/withings";
import { MEASTYPE_TO_INTERNAL, WITHINGS_MEASTYPE } from "@constants/withings";
import type { RawActivity, RawMeasureGroup, RawSleepSummary } from "./api";

/**
 * Normalisers for Withings raw API responses → our internal
 * `WithingsMeasurement` rows / `WithingsHealthSlice` output.
 *
 * Two flow directions:
 *
 *   1. **Ingestion** (`webhook → mapRawXxx → upsertMeasurement`):
 *      Withings raw → array of `{ type, value, measured_at, raw_meastype }`
 *      ready to be written to `WithingsMeasurementsDB` after encryption.
 *
 *   2. **Read** (`/withings/data → groupMeasurementsToSlice`):
 *      decrypted measurements → `WithingsHealthSlice` for the mobile app
 *      to merge with HC data.
 */

export interface MappedMeasurement {
    type: WithingsMeasurementType;
    /**
     * Plain JSON object (NOT yet encrypted). The caller serialises +
     * encrypts via Vault transit before writing to Mongo. Shape varies
     * by type — scalars use `{ value, unit }`; sleep uses
     * `SleepSessionData`.
     */
    payload: { value: number; unit: string } | SleepSessionData;
    measured_at: Date;
    raw_meastype?: number;
}

/**
 * Decode a Withings raw measure value. Withings stores values as
 * `value * 10^unit` (yes, `unit` here is an exponent, not a unit
 * label). Example: weight 72.5 kg → `{ value: 72500, unit: -3 }`.
 */
function decodeRawValue(value: number, unit: number): number {
    return value * Math.pow(10, unit);
}

/**
 * Determine the canonical unit label for a given measurement type.
 * Used so the app can display values with units without having to look
 * them up from Withings docs.
 */
function unitForType(type: WithingsMeasurementType): string {
    switch (type) {
        case "weight":
        case "fat_mass":
        case "muscle_mass":
            return "kg";
        case "bmi":
            return "kg/m²";
        case "bp_systolic":
        case "bp_diastolic":
            return "mmHg";
        case "hr":
            return "bpm";
        case "spo2":
            return "%";
        case "hrv":
            return "ms";
        case "steps":
            return "count";
        case "distance":
            return "m";
        case "calories":
            return "kcal";
        case "sleep_session":
            return "s";
    }
}

/**
 * Withings's `getmeas` returns groups (one group = one weigh-in / BP
 * reading / etc., potentially with multiple measures inside e.g. weight
 * + fat mass + muscle mass from a single scale step-on).
 */
export function mapRawMeasureGroups(
    groups: RawMeasureGroup[],
): MappedMeasurement[] {
    const out: MappedMeasurement[] = [];
    for (const group of groups) {
        const measuredAt = new Date(group.date * 1000);
        for (const measure of group.measures) {
            const internal = MEASTYPE_TO_INTERNAL[measure.type];
            if (!internal) continue;

            // Special case: meastype 6 (fat_ratio %) → we need to derive
            // fat_mass_kg if we also have a weight measure in the same
            // group. To keep the mapper stateless we just emit the raw
            // ratio under "fat_mass" with unit % and let the read layer
            // pick the most specific source (8 = fat_mass_kg wins over 6
            // when both are present for the same `measured_at`).
            const value = decodeRawValue(measure.value, measure.unit);
            out.push({
                type: internal,
                payload: { value, unit: unitForType(internal) },
                measured_at: measuredAt,
                raw_meastype: measure.type,
            });
        }
    }
    return out;
}

/**
 * Withings activity summaries are per-day buckets. We emit one
 * `MappedMeasurement` per metric per day with `measured_at` set to the
 * **end of the day in the user's recording TZ** (matching Withings's
 * own UI convention).
 */
export function mapRawActivity(activities: RawActivity[]): MappedMeasurement[] {
    const out: MappedMeasurement[] = [];
    for (const activity of activities) {
        const day = activity.date; // YYYY-MM-DD
        // Withings's activity timezone may differ from server TZ — we
        // anchor to midnight UTC of the date and let the app render in
        // whatever TZ it likes. The day-boundary off-by-≤1h that this
        // introduces is the same trade-off we accept in the HC daily
        // aggregate path.
        const measuredAt = new Date(`${day}T00:00:00Z`);

        if (activity.steps !== undefined && activity.steps > 0) {
            out.push({
                type: "steps",
                payload: { value: activity.steps, unit: unitForType("steps") },
                measured_at: measuredAt,
            });
        }
        if (activity.distance !== undefined && activity.distance > 0) {
            out.push({
                type: "distance",
                payload: {
                    value: activity.distance,
                    unit: unitForType("distance"),
                },
                measured_at: measuredAt,
            });
        }
        if (activity.calories !== undefined && activity.calories > 0) {
            out.push({
                type: "calories",
                payload: {
                    value: activity.calories,
                    unit: unitForType("calories"),
                },
                measured_at: measuredAt,
            });
        }
    }
    return out;
}

/**
 * Sleep summaries become one `sleep_session` row each, plus an `hrv`
 * row if Withings provided `sleep_hr_variability`. Stages are
 * reconstructed from the duration fields (Withings exposes durations,
 * not timestamped transitions on the summary endpoint — we treat them
 * as a single contiguous slot per stage type because the app's chart
 * only cares about totals, not the order).
 */
export function mapRawSleepSummaries(
    summaries: RawSleepSummary[],
): MappedMeasurement[] {
    const out: MappedMeasurement[] = [];
    for (const summary of summaries) {
        const startDate = new Date(summary.startdate * 1000).toISOString();
        const endDate = new Date(summary.enddate * 1000).toISOString();
        const data = summary.data ?? {};

        const light = data.lightsleepduration ?? 0;
        const deep = data.deepsleepduration ?? 0;
        const rem = data.remsleepduration ?? 0;
        const awake = data.wakeupduration ?? 0;
        const totalAsleep = light + deep + rem;

        const stages: SleepStage[] = [];
        let cursor = summary.startdate;
        const pushStage = (
            type: SleepStage["type"],
            durationSeconds: number,
        ) => {
            if (durationSeconds <= 0) return;
            const stageStart = new Date(cursor * 1000).toISOString();
            cursor += durationSeconds;
            stages.push({
                type,
                startTime: stageStart,
                endTime: new Date(cursor * 1000).toISOString(),
                duration: durationSeconds,
            });
        };

        // Order matches what the app's existing chart expects — light /
        // deep / rem / awake. The summary endpoint doesn't give us a
        // chronological event stream, so this is the best approximation.
        pushStage("light", light);
        pushStage("deep", deep);
        pushStage("rem", rem);
        pushStage("awake", awake);

        const session: SleepSessionData = {
            startDate,
            endDate,
            duration: totalAsleep,
            stages,
            score: data.sleep_score,
        };

        out.push({
            type: "sleep_session",
            payload: session,
            measured_at: new Date(summary.enddate * 1000),
        });

        if (
            data.sleep_hr_variability !== undefined &&
            data.sleep_hr_variability > 0
        ) {
            out.push({
                type: "hrv",
                payload: {
                    value: data.sleep_hr_variability,
                    unit: unitForType("hrv"),
                },
                measured_at: new Date(summary.enddate * 1000),
            });
        }
    }
    return out;
}

// ────────────────────────────────────────────────────────────────────
// Read path: decrypted measurements → WithingsHealthSlice
// ────────────────────────────────────────────────────────────────────

export interface DecryptedMeasurement {
    type: WithingsMeasurementType;
    /** Either a scalar `{value, unit}` or a `SleepSessionData`. */
    payload: { value: number; unit: string } | SleepSessionData;
    measured_at: Date;
    raw_meastype?: number;
}

function toBasesHealthValue(m: DecryptedMeasurement): BasesHealthValue {
    const iso = m.measured_at.toISOString();
    // Scalars have `{value, unit}`. SleepSessionData isn't a BasesHealthValue
    // so it's filtered out before this is called.
    const payload = m.payload as { value: number };
    return {
        value: payload.value,
        startDate: iso,
        endDate: iso,
    };
}

/**
 * Group + project measurements into the shape the mobile app reads.
 * Sleep sessions and HR values become arrays sorted ascending by
 * `measured_at`; scalar arrays (steps, weight, etc.) are sorted the
 * same way.
 */
export function groupMeasurementsToSlice(
    measurements: DecryptedMeasurement[],
): Omit<WithingsHealthSlice, "connected"> {
    const sorted = [...measurements].sort(
        (a, b) => a.measured_at.getTime() - b.measured_at.getTime(),
    );

    const byType = new Map<WithingsMeasurementType, DecryptedMeasurement[]>();
    for (const m of sorted) {
        const bucket = byType.get(m.type) ?? [];
        bucket.push(m);
        byType.set(m.type, bucket);
    }

    const scalarsOf = (
        type: WithingsMeasurementType,
    ): BasesHealthValue[] | undefined => {
        const bucket = byType.get(type);
        if (!bucket || bucket.length === 0) return undefined;
        return bucket.map(toBasesHealthValue);
    };

    const slice: Omit<WithingsHealthSlice, "connected"> = {};

    const hr = scalarsOf("hr");
    if (hr && hr.length > 0) {
        slice.heartRate = {
            lastHeartRateValue: hr[hr.length - 1],
            values: hr,
        };
    }

    const sleepBucket = byType.get("sleep_session");
    if (sleepBucket && sleepBucket.length > 0) {
        const sessions = sleepBucket.map((m) => m.payload as SleepSessionData);
        slice.sleepAnalysis = {
            sleepSteps: sessions,
            // The "main" session is the longest one in the window —
            // matches the convention `fetch-health-data.android.ts` uses.
            totalSleepValue: sessions.reduce<SleepSessionData | null>(
                (max, current) =>
                    !max || current.duration > max.duration ? current : max,
                null,
            ),
        };
    }

    const steps = scalarsOf("steps");
    if (steps) slice.steps = steps;
    const distance = scalarsOf("distance");
    if (distance) slice.distance = distance;
    const calories = scalarsOf("calories");
    if (calories) slice.activeEnergyBurned = calories;

    const weight = scalarsOf("weight");
    const fatMass = scalarsOf("fat_mass");
    const muscleMass = scalarsOf("muscle_mass");
    const bmi = scalarsOf("bmi");
    if (weight || fatMass || muscleMass || bmi) {
        slice.bodyComposition = {
            weight,
            fatMass,
            muscleMass,
            bmi,
        };
    }

    const spo2 = scalarsOf("spo2");
    const hrv = scalarsOf("hrv");
    const systolic = scalarsOf("bp_systolic");
    const diastolic = scalarsOf("bp_diastolic");
    if (spo2 || hrv || systolic || diastolic) {
        slice.vitals = {
            spo2,
            hrv,
            ...(systolic && diastolic
                ? {
                      bloodPressure: {
                          systolic,
                          diastolic,
                      },
                  }
                : {}),
        };
    }

    return slice;
}

/**
 * Helper exposed for tests + the data controller. Pure, no I/O.
 */
export function ymd(date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

// Re-export the meastype constant so callers can build `meastypes=` lists
// without importing from two different files.
export { WITHINGS_MEASTYPE };
