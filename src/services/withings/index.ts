/**
 * Public facade for the Withings service. Re-exports the surface the
 * rest of the codebase (controllers, jobs) needs, keeping internal
 * helpers (api.ts low-level functions, rate-limiter internals) out of
 * the public API.
 */

export {
    buildAuthorizeUrl,
    verifyState,
    exchangeCode,
    persistTokens,
    withFreshToken,
    refreshAndPersist,
} from "./oauth";

export { subscribeAllApplis, unsubscribeAllApplis } from "./notify";

export {
    mapRawMeasureGroups,
    mapRawActivity,
    mapRawSleepSummaries,
    groupMeasurementsToSlice,
    ymd,
    type MappedMeasurement,
    type DecryptedMeasurement,
} from "./mapper";

export {
    getMeasures,
    getActivity,
    getSleepSummary,
    WithingsAuthError,
    WithingsApiError,
} from "./api";

export {
    tryAcquire as tryAcquireRateSlot,
    release as releaseRateSlot,
    inspect as inspectRateSlot,
    forget as forgetRateSlot,
} from "./rate-limiter";

export { WITHINGS_TOKEN_KEY, WITHINGS_MEASUREMENT_KEY } from "./constants";
