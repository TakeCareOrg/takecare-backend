export const USER_DATA_UPDATES_TYPES = [
    "health_data",
    "user_info",
    // Withings integration events — used by `UserUpdatesDB` to keep a
    // lightweight audit log without coupling the user/health collections
    // to the Withings ones.
    "withings_connected",
    "withings_disconnected",
    "withings_measurement",
] as const;
