// Vault secret types

export interface MongoDbSecrets {
    TAKECARE_DATABASE_URL: string;
}

export interface JwtSecrets {
    JWT_PRIVATE_KEY: string;
    JWT_PUBLIC_KEY: string;
}

export interface MailSecrets {
    EMAIL_HOST: string;
    EMAIL_PORT: string;
    GOOGLE_APP_EMAIL: string;
    GOOGLE_APP_PASSWORD: string;
}

export interface ChatSecrets {
    TOGETHER_API_KEY: string;
    CHAT_START_MESSAGE: string;
}

/**
 * Withings dev-portal credentials + the public callback URLs we registered
 * with them. Storing the URLs in Vault (rather than env vars) keeps prod
 * and staging deployments in sync — same Vault path, different secret
 * versions if we ever ship multiple environments off this same backend
 * codebase.
 */
export interface WithingsSecrets {
    WITHINGS_CLIENT_ID: string;
    WITHINGS_CLIENT_SECRET: string;
    /** HTTPS URL Withings 302s to after the user authorises. Must match dev portal config exactly. */
    WITHINGS_REDIRECT_URI: string;
    /** HTTPS URL Withings POSTs to when a measurement is taken. Per-appli registered via NotifyAPI on connect. */
    WITHINGS_WEBHOOK_URL: string;
}
