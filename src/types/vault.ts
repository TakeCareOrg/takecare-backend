// Vault secret types

export interface MongoDbSecrets {
    TAKECARE_DATABASE_URL: string;
}

export interface JwtSecrets {
    JWT_SECRET: string;
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
