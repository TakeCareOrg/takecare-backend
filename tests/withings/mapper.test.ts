import {
    groupMeasurementsToSlice,
    mapRawActivity,
    mapRawMeasureGroups,
    mapRawSleepSummaries,
    ymd,
} from "@services/withings/mapper";
import { WITHINGS_MEASTYPE } from "@constants/withings";
import type {
    RawActivity,
    RawMeasureGroup,
    RawSleepSummary,
} from "@services/withings/api";

/**
 * Mapper tests. Pure functions — no Mongo, no Vault, no HTTP.
 *
 * The mapper is the layer where Withings's quirks (value scaling by
 * 10^unit, comma-separated scopes, sleep-summary durations instead of
 * timestamped stages) get normalised into the shape the app consumes,
 * so it deserves the heaviest coverage.
 */

describe("Withings → internal mapper", () => {
    describe("mapRawMeasureGroups", () => {
        it("decodes scalar values via value*10^unit", () => {
            const groups: RawMeasureGroup[] = [
                {
                    grpid: 1,
                    date: 1_700_000_000,
                    created: 1_700_000_000,
                    measures: [
                        {
                            type: WITHINGS_MEASTYPE.WEIGHT_KG,
                            value: 72_500,
                            unit: -3,
                        },
                    ],
                },
            ];
            const mapped = mapRawMeasureGroups(groups);
            expect(mapped).toHaveLength(1);
            const payload = mapped[0].payload as {
                value: number;
                unit: string;
            };
            expect(payload.value).toBeCloseTo(72.5);
            expect(payload.unit).toBe("kg");
            expect(mapped[0].type).toBe("weight");
        });

        it("drops measure types that don't have an internal mapping", () => {
            const groups: RawMeasureGroup[] = [
                {
                    grpid: 1,
                    date: 1_700_000_000,
                    created: 1_700_000_000,
                    measures: [
                        // 71 = Body Temperature, intentionally not mapped in v1.
                        { type: 71, value: 365, unit: -1 },
                    ],
                },
            ];
            expect(mapRawMeasureGroups(groups)).toHaveLength(0);
        });

        it("emits two rows when the scale reports both fat ratio and fat mass", () => {
            // A real Withings group typically carries weight + fat ratio +
            // fat mass + muscle mass in the same step-on.
            const groups: RawMeasureGroup[] = [
                {
                    grpid: 1,
                    date: 1_700_000_000,
                    created: 1_700_000_000,
                    measures: [
                        {
                            type: WITHINGS_MEASTYPE.WEIGHT_KG,
                            value: 72_500,
                            unit: -3,
                        },
                        {
                            type: WITHINGS_MEASTYPE.FAT_RATIO_PCT,
                            value: 24_000,
                            unit: -3,
                        },
                        {
                            type: WITHINGS_MEASTYPE.FAT_MASS_KG,
                            value: 17_400,
                            unit: -3,
                        },
                    ],
                },
            ];
            const mapped = mapRawMeasureGroups(groups);
            // Internal mapping collapses fat_ratio + fat_mass_kg both to
            // "fat_mass" — that's intentional. The read layer dedupes
            // on (user_id, type, measured_at) via the compound unique
            // index, so the more specific value (kg) wins.
            expect(mapped.map((m) => m.type).sort()).toEqual([
                "fat_mass",
                "fat_mass",
                "weight",
            ]);
        });
    });

    describe("mapRawActivity", () => {
        it("anchors each daily bucket to YYYY-MM-DD UTC midnight", () => {
            const activities: RawActivity[] = [
                {
                    date: "2026-05-12",
                    timezone: "Europe/Paris",
                    steps: 5432,
                    distance: 4100,
                    calories: 256,
                },
            ];
            const mapped = mapRawActivity(activities);
            expect(mapped).toHaveLength(3);
            const steps = mapped.find((m) => m.type === "steps");
            expect(steps?.measured_at.toISOString()).toBe(
                "2026-05-12T00:00:00.000Z",
            );
            expect((steps?.payload as { value: number }).value).toBe(5432);
        });

        it("drops zero-valued metrics so they don't pollute the chart", () => {
            const activities: RawActivity[] = [
                {
                    date: "2026-05-12",
                    timezone: "Europe/Paris",
                    steps: 0,
                    distance: 0,
                    calories: 0,
                },
            ];
            expect(mapRawActivity(activities)).toHaveLength(0);
        });
    });

    describe("mapRawSleepSummaries", () => {
        it("turns one summary into a sleep_session + optional hrv row", () => {
            const summaries: RawSleepSummary[] = [
                {
                    id: 1,
                    timezone: "Europe/Paris",
                    date: "2026-05-12",
                    startdate: 1_715_000_000,
                    enddate: 1_715_028_000,
                    data: {
                        lightsleepduration: 12_000,
                        deepsleepduration: 6_000,
                        remsleepduration: 4_000,
                        wakeupduration: 800,
                        sleep_score: 82,
                        sleep_hr_variability: 48,
                    },
                },
            ];
            const mapped = mapRawSleepSummaries(summaries);
            expect(mapped.map((m) => m.type)).toEqual([
                "sleep_session",
                "hrv",
            ]);
            const session = mapped[0].payload as {
                duration: number;
                stages: { type: string; duration: number }[];
            };
            // Total sleep = light + deep + rem (awake excluded).
            expect(session.duration).toBe(22_000);
            // Stages reflect what Withings exposed — light/deep/rem/awake
            // in that fixed order.
            expect(session.stages.map((s) => s.type)).toEqual([
                "light",
                "deep",
                "rem",
                "awake",
            ]);
        });

        it("skips the hrv row when Withings didn't surface hr_variability", () => {
            const summaries: RawSleepSummary[] = [
                {
                    id: 1,
                    timezone: "Europe/Paris",
                    date: "2026-05-12",
                    startdate: 1_715_000_000,
                    enddate: 1_715_028_000,
                    data: {
                        lightsleepduration: 5_000,
                    },
                },
            ];
            const mapped = mapRawSleepSummaries(summaries);
            expect(mapped.map((m) => m.type)).toEqual(["sleep_session"]);
        });
    });

    describe("groupMeasurementsToSlice", () => {
        it("projects heart rate into a `heartRate` slice with the latest sample on top", () => {
            const measurements = [
                {
                    type: "hr" as const,
                    payload: { value: 60, unit: "bpm" },
                    measured_at: new Date("2026-05-12T07:00:00Z"),
                },
                {
                    type: "hr" as const,
                    payload: { value: 75, unit: "bpm" },
                    measured_at: new Date("2026-05-12T08:00:00Z"),
                },
            ];
            const slice = groupMeasurementsToSlice(measurements);
            expect(slice.heartRate?.values).toHaveLength(2);
            expect(slice.heartRate?.lastHeartRateValue?.value).toBe(75);
        });

        it("emits bodyComposition only when at least one related metric is present", () => {
            const slice = groupMeasurementsToSlice([
                {
                    type: "weight" as const,
                    payload: { value: 72, unit: "kg" },
                    measured_at: new Date("2026-05-12T07:00:00Z"),
                },
            ]);
            expect(slice.bodyComposition?.weight?.[0].value).toBe(72);
            expect(slice.bodyComposition?.fatMass).toBeUndefined();
        });

        it("groups bp_systolic + bp_diastolic into vitals.bloodPressure", () => {
            const slice = groupMeasurementsToSlice([
                {
                    type: "bp_systolic" as const,
                    payload: { value: 120, unit: "mmHg" },
                    measured_at: new Date("2026-05-12T07:00:00Z"),
                },
                {
                    type: "bp_diastolic" as const,
                    payload: { value: 78, unit: "mmHg" },
                    measured_at: new Date("2026-05-12T07:00:00Z"),
                },
            ]);
            expect(slice.vitals?.bloodPressure?.systolic[0].value).toBe(120);
            expect(slice.vitals?.bloodPressure?.diastolic[0].value).toBe(78);
        });
    });

    describe("ymd helper", () => {
        it("formats UTC date as YYYY-MM-DD", () => {
            // 2026-05-12T23:30:00Z still emits 2026-05-12 because we
            // intentionally use UTC components (matches what
            // mapRawActivity assumes).
            expect(ymd(new Date("2026-05-12T23:30:00Z"))).toBe("2026-05-12");
        });
    });
});
