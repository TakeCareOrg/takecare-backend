import type {
    MongoDbSecrets,
    JwtSecrets,
    MailSecrets,
    ChatSecrets,
} from "@dtypes/vault";

export interface AppSecrets {
    mongo: MongoDbSecrets;
    jwt: JwtSecrets;
    mail: MailSecrets;
    chat: ChatSecrets;
}

let secrets: AppSecrets | null = null;

export function setSecrets(appSecrets: AppSecrets): void {
    secrets = appSecrets;
}

export function getSecrets(): AppSecrets {
    if (!secrets) {
        throw new Error(
            "Secrets not initialized. Call setSecrets() after Vault init.",
        );
    }
    return secrets;
}

/**
 * Check if we're running in development mode.
 */
export function isDev(): boolean {
    return process.env.NODE_ENV !== "production";
}

/**
 * Load all secrets from environment variables (.env).
 * Used in development mode instead of Vault.
 */
export function loadSecretsFromEnv(): {
    appSecrets: AppSecrets;
} {
    const mongoSecrets: MongoDbSecrets = {
        TAKECARE_DATABASE_URL: process.env.TAKECARE_DATABASE_URL || "",
    };

    const jwtSecrets: JwtSecrets = {
        JWT_PRIVATE_KEY: process.env.JWT_PRIVATE_KEY || "",
        JWT_PUBLIC_KEY: process.env.JWT_PUBLIC_KEY || "",
    };

    const mailSecrets: MailSecrets = {
        EMAIL_HOST: process.env.EMAIL_HOST || "",
        EMAIL_PORT: process.env.EMAIL_PORT || "",
        GOOGLE_APP_EMAIL: process.env.GOOGLE_APP_EMAIL || "",
        GOOGLE_APP_PASSWORD: process.env.GOOGLE_APP_PASSWORD || "",
    };

    const chatSecrets: ChatSecrets = {
        TOGETHER_API_KEY: process.env.TOGETHER_API_KEY || "",
        CHAT_START_MESSAGE: process.env.CHAT_START_MESSAGE || "",
    };

    return {
        appSecrets: {
            mongo: mongoSecrets,
            jwt: jwtSecrets,
            mail: mailSecrets,
            chat: chatSecrets,
        },
    };
}
