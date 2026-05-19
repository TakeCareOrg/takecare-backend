import type {
    MongoDbSecrets,
    JwtSecrets,
    MailSecrets,
    ChatSecrets,
    WithingsSecrets,
} from "@dtypes/vault";

export interface AppSecrets {
    mongo: MongoDbSecrets;
    jwt: JwtSecrets;
    mail: MailSecrets;
    chat: ChatSecrets;
    /**
     * Optional because Withings is an integration, not a core dependency
     * of the backend — if its Vault path is missing or unreachable on
     * startup we still want the rest of the app to come up. Consumers of
     * this field must null-check before use.
     */
    withings?: WithingsSecrets;
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
