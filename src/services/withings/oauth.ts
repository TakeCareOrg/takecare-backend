import jwt from "jsonwebtoken";
import Logger from "@libs/logger";
import VaultService from "@services/vault";
import { getSecrets } from "@config/secrets";
import { WithingsAccountDB } from "@database/models/withings";
import type { WithingsTokenBundle } from "@dtypes/withings";
import { WITHINGS_AUTHORIZE_URL, WITHINGS_SCOPES } from "@constants/withings";
import {
    WITHINGS_OAUTH_ENDPOINT,
    WITHINGS_TOKEN_KEY,
    STATE_TOKEN_TTL_SECONDS,
} from "./constants";
import {
    WithingsAuthError,
    withingsPostAuthenticated,
    withingsPostPublic,
} from "./api";

/**
 * OAuth state lifecycle:
 *
 *   1. Mobile app POSTs `/withings/oauth/init` (with our JWT).
 *   2. We build the `authorize_url` and embed a **signed JWT state** that
 *      includes the local user_id. App opens the browser.
 *   3. User authorises on Withings. Withings 302s to our HTTPS callback
 *      with `?code&state`.
 *   4. Callback verifies the state JWT → extracts user_id → exchanges
 *      `code` for tokens → encrypts + persists → subscribes NotifyAPI →
 *      302 to `app-scheme://withings/callback?status=success`.
 *
 * Using a signed JWT for state means we don't need any server-side
 * session store; the JWT itself carries the binding.
 */

interface WithingsState {
    user_id: string;
    nonce: string;
    /** Issued-at, for sanity. exp is enforced by jsonwebtoken itself. */
    iat: number;
}

function getWithingsSecrets() {
    const secrets = getSecrets();
    if (!secrets.withings) {
        throw new Error(
            "WITHINGS_NOT_CONFIGURED: Vault path takecare/data/withings was not loaded at startup",
        );
    }
    return secrets.withings;
}

function getJwtSecret(): string {
    return getSecrets().jwt.JWT_PRIVATE_KEY;
}

/**
 * Build the Withings authorize URL + the signed state token. Caller
 * forwards both to the mobile app, which opens the URL in a browser.
 */
export function buildAuthorizeUrl(userId: string): {
    authorize_url: string;
    state: string;
} {
    const { WITHINGS_CLIENT_ID, WITHINGS_REDIRECT_URI } = getWithingsSecrets();
    const state = jwt.sign(
        {
            user_id: userId,
            nonce: cryptoRandom(),
        } satisfies Omit<WithingsState, "iat">,
        getJwtSecret(),
        { expiresIn: STATE_TOKEN_TTL_SECONDS, algorithm: "HS256" },
    );

    const url = new URL(WITHINGS_AUTHORIZE_URL);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", WITHINGS_CLIENT_ID);
    url.searchParams.set("state", state);
    // Withings expects scopes comma-separated (NOT space-separated — quirk).
    url.searchParams.set("scope", WITHINGS_SCOPES.join(","));
    url.searchParams.set("redirect_uri", WITHINGS_REDIRECT_URI);

    return { authorize_url: url.toString(), state };
}

/**
 * Verify the state JWT returned by Withings. Throws if expired/invalid.
 * Returns the local user_id we encoded in step 2.
 */
export function verifyState(stateToken: string): string {
    const decoded = jwt.verify(stateToken, getJwtSecret(), {
        algorithms: ["HS256"],
    }) as WithingsState;
    if (!decoded?.user_id) {
        throw new Error("WITHINGS_INVALID_STATE");
    }
    return decoded.user_id;
}

/**
 * Exchange an authorisation code for tokens. Called once per connection
 * from the callback controller.
 */
export async function exchangeCode(code: string): Promise<WithingsTokenBundle> {
    const {
        WITHINGS_CLIENT_ID,
        WITHINGS_CLIENT_SECRET,
        WITHINGS_REDIRECT_URI,
    } = getWithingsSecrets();
    return await withingsPostPublic<WithingsTokenBundle>({
        endpoint: WITHINGS_OAUTH_ENDPOINT,
        action: "requesttoken",
        params: {
            grant_type: "authorization_code",
            client_id: WITHINGS_CLIENT_ID,
            client_secret: WITHINGS_CLIENT_SECRET,
            code,
            redirect_uri: WITHINGS_REDIRECT_URI,
        },
    });
}

/**
 * Refresh tokens. **Critical**: Withings rotates the refresh token on
 * every refresh — the response's `refresh_token` replaces the previous
 * one and must be persisted before the next refresh. Failure to persist
 * leaves us locked out for that user.
 */
export async function refreshTokens(
    refreshToken: string,
): Promise<WithingsTokenBundle> {
    const { WITHINGS_CLIENT_ID, WITHINGS_CLIENT_SECRET } = getWithingsSecrets();
    return await withingsPostPublic<WithingsTokenBundle>({
        endpoint: WITHINGS_OAUTH_ENDPOINT,
        action: "requesttoken",
        params: {
            grant_type: "refresh_token",
            client_id: WITHINGS_CLIENT_ID,
            client_secret: WITHINGS_CLIENT_SECRET,
            refresh_token: refreshToken,
        },
    });
}

/**
 * Persist a freshly-exchanged token bundle. Used by both the initial
 * connect flow (creates the row) and the refresh job (updates it).
 *
 * Idempotent on `user_id`: a soft-deleted account (with `disconnected_at`
 * set) that reconnects reuses the same row — the historical
 * `WithingsMeasurementsDB` rows stay linked.
 */
export async function persistTokens({
    userId,
    bundle,
    subscribedApplis,
}: {
    userId: string;
    bundle: WithingsTokenBundle;
    subscribedApplis?: number[];
}): Promise<void> {
    const encryptedAccess = await VaultService.encrypt({
        keyName: WITHINGS_TOKEN_KEY,
        plaintext: bundle.access_token,
        context: userId,
    });
    const encryptedRefresh = await VaultService.encrypt({
        keyName: WITHINGS_TOKEN_KEY,
        plaintext: bundle.refresh_token,
        context: userId,
    });

    const expiresAt = new Date(Date.now() + bundle.expires_in * 1000);

    await WithingsAccountDB.findOneAndUpdate(
        { user_id: userId },
        {
            $set: {
                WITHINGS_user_id: bundle.userid,
                access_token: encryptedAccess,
                refresh_token: encryptedRefresh,
                scope: bundle.scope,
                access_token_expires_at: expiresAt,
                last_refreshed_at: new Date(),
                ...(subscribedApplis
                    ? { subscribed_applis: subscribedApplis }
                    : {}),
            },
            $setOnInsert: {
                user_id: userId,
                connected_at: new Date(),
            },
            $unset: { disconnected_at: "" },
        },
        { upsert: true, new: true },
    );
}

/**
 * Public wrapper: decrypt the user's current access token, call `fn`,
 * and transparently refresh + retry on Withings auth errors.
 *
 * `fn` is invoked with a fresh access token. If Withings rejects it
 * mid-call (rare; we only refresh proactively when we're <60s from
 * expiry), we refresh once and retry. Two failures → throw.
 */
export async function withFreshToken<T>(
    userId: string,
    fn: (accessToken: string) => Promise<T>,
): Promise<T> {
    const account = await WithingsAccountDB.findOne({
        user_id: userId,
        disconnected_at: { $exists: false },
    });
    if (!account) {
        throw new Error("WITHINGS_ACCOUNT_NOT_FOUND");
    }

    const now = Date.now();
    const expiresAt = account.access_token_expires_at.getTime();
    const needsProactiveRefresh = expiresAt - now < 60_000;

    let accessToken: string;
    if (needsProactiveRefresh) {
        accessToken = await refreshAndPersist(userId);
    } else {
        accessToken = await VaultService.decrypt({
            keyName: WITHINGS_TOKEN_KEY,
            ciphertext: account.access_token,
            context: userId,
        });
    }

    try {
        return await fn(accessToken);
    } catch (error) {
        if (error instanceof WithingsAuthError) {
            // Token died mid-flight. Refresh once and retry.
            const refreshedToken = await refreshAndPersist(userId);
            return await fn(refreshedToken);
        }
        throw error;
    }
}

/**
 * Refresh + persist for the current user. Returns the new access token
 * (plain, for immediate use by the caller).
 */
export async function refreshAndPersist(userId: string): Promise<string> {
    const account = await WithingsAccountDB.findOne({ user_id: userId });
    if (!account) {
        throw new Error("WITHINGS_ACCOUNT_NOT_FOUND");
    }

    const plainRefreshToken = await VaultService.decrypt({
        keyName: WITHINGS_TOKEN_KEY,
        ciphertext: account.refresh_token,
        context: userId,
    });

    try {
        const bundle = await refreshTokens(plainRefreshToken);
        await persistTokens({ userId, bundle });
        Logger.info(`Withings tokens refreshed for user ${userId}`);
        return bundle.access_token;
    } catch (error) {
        if (error instanceof WithingsAuthError) {
            // Refresh token itself is dead (user revoked from Withings UI
            // or 90+ days passed without use). Soft-disconnect so the
            // app prompts the user to reconnect.
            await WithingsAccountDB.updateOne(
                { user_id: userId },
                { $set: { disconnected_at: new Date() } },
            );
            Logger.warn(
                `Withings refresh failed for user ${userId} — soft-disconnected`,
            );
        }
        throw error;
    }
}

/**
 * Pure helper — `withingsPostAuthenticated` re-exported for tests that
 * want to mock the inner HTTP call rather than the full `withFreshToken`
 * orchestration.
 */
export const __testables = {
    withingsPostAuthenticated,
};

function cryptoRandom(): string {
    // Lightweight nonce — JWT signature is the real CSRF defence; this
    // just guarantees state tokens aren't byte-identical across requests.
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
