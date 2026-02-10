import type { JwtSecrets, MailSecrets, ChatSecrets } from "@dtypes/vault";

interface AppSecrets {
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
