/**
 * Service-internal constants. Public-facing constants live in
 * `src/constants/withings.ts`; this file is for things the rest of the
 * codebase shouldn't depend on.
 */

import { WITHINGS_API_BASE } from "@constants/withings";

/** OAuth2 endpoint (token exchange + refresh). */
export const WITHINGS_OAUTH_ENDPOINT = `${WITHINGS_API_BASE}/v2/oauth2`;

/** Notify (webhook subscription) endpoint. */
export const WITHINGS_NOTIFY_ENDPOINT = `${WITHINGS_API_BASE}/notify`;

/** Body composition + general measurement endpoint. */
export const WITHINGS_MEASURE_ENDPOINT = `${WITHINGS_API_BASE}/measure`;

/** Activity summary endpoint (steps, distance, calories). */
export const WITHINGS_MEASURE_V2_ENDPOINT = `${WITHINGS_API_BASE}/v2/measure`;

/** Sleep summary endpoint. */
export const WITHINGS_SLEEP_ENDPOINT = `${WITHINGS_API_BASE}/v2/sleep`;

/**
 * State JWT lifetime — long enough for a slow user (entering creds, 2FA)
 * but short enough that a leaked state can't be replayed indefinitely.
 */
export const STATE_TOKEN_TTL_SECONDS = 10 * 60;

/**
 * Vault transit key used to encrypt access/refresh tokens. The
 * measurement payloads reuse the existing `health-data` key — see
 * `mapper.ts` and the call sites in `oauth.ts` / `webhook` controller.
 */
export const WITHINGS_TOKEN_KEY = "withings-tokens";
export const WITHINGS_MEASUREMENT_KEY = "health-data";

/** axios timeout for Withings outbound calls. They occasionally hang. */
export const WITHINGS_HTTP_TIMEOUT_MS = 15_000;
