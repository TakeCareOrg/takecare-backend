// src/config/vault.ts
import vault from "node-vault";
import Logger from "@libs/logger";
import type NodeVault from "node-vault";

interface VaultConfig {
    endpoint: string;
    token?: string;
}

class VaultService {
    private client: NodeVault.client;
    private isInitialized: boolean = false;

    constructor() {
        const vaultConfig: VaultConfig = {
            endpoint: process.env.VAULT_ADDR || "http://localhost:8200",
            token: process.env.VAULT_TOKEN,
        };

        this.client = vault({
            apiVersion: "v1",
            endpoint: vaultConfig.endpoint,
            token: vaultConfig.token,
        });
    }

    async init() {
        try {
            // Check seal status
            const sealStatus = await this.client.status();

            // If sealed, try to unseal
            if (sealStatus.sealed) {
                Logger.warn("🔒 Vault is sealed, attempting to unseal...");

                for (let i = 1; i <= 5; i++) {
                    const key = process.env[`VAULT_UNSEAL_KEY_${i}`];
                    if (key) {
                        await this.unsealVault(key);
                    }
                }
            }

            // Vérifier la connexion
            const health = await this.client.health();
            Logger.debug("Connected to Vault", health);
            this.isInitialized = true;
        } catch (error) {
            Logger.error("Failed to connect to Vault", error);
            throw error;
        }
    }

    // Unseal the vault
    private async unsealVault(key: string): Promise<void> {
        try {
            const result = await this.client.unseal({
                secret_shares: 1,
                key: key,
            });

            if (!result.sealed) {
                Logger.info("✅ Vault unsealed successfully");
                return;
            }
        } catch (error) {
            Logger.error("Failed to unseal Vault", error);
            throw error;
        }
    }

    // Check seal status
    async getSealStatus(): Promise<{
        sealed: boolean;
        progress: number;
        threshold: number;
    }> {
        try {
            const status = await this.client.status();
            return {
                sealed: status.sealed,
                progress: status.progress,
                threshold: status.t,
            };
        } catch (error) {
            Logger.error("Failed to get seal status", error);
            throw error;
        }
    }

    // Lire un secret
    async getSecret<T = Record<string, unknown>>(path: string): Promise<T> {
        if (!this.isInitialized) {
            await this.init();
        }

        try {
            const result = await this.client.read(path);
            return result.data.data as T; // KV v2 engine
        } catch (error) {
            Logger.error(`Failed to read secret from ${path}`, error);
            throw error;
        }
    }

    // Écrire un secret
    async setSecret(
        path: string,
        data: Record<string, unknown>,
    ): Promise<NodeVault.client["write"]> {
        if (!this.isInitialized) {
            await this.init();
        }

        try {
            const result = await this.client.write(path, { data });
            Logger.info(`Secret written to ${path}`);
            return result.data;
        } catch (error) {
            Logger.error(`Failed to write secret to ${path}`, error);
            throw error;
        }
    }

    // Supprimer un secret
    async deleteSecret(path: string): Promise<void> {
        if (!this.isInitialized) {
            await this.init();
        }

        try {
            await this.client.delete(path);
            Logger.info(`Secret deleted from ${path}`);
        } catch (error) {
            Logger.error(`Failed to delete secret from ${path}`, error);
            throw error;
        }
    }

    // Lister les secrets
    async listSecrets(path: string): Promise<string[]> {
        if (!this.isInitialized) {
            await this.init();
        }

        try {
            const result = await this.client.list(path);
            return result.data.keys;
        } catch (error) {
            Logger.error(`Failed to list secrets at ${path}`, error);
            throw error;
        }
    }

    async createNewEngine(
        mountPoint: string,
        type: string = "kv",
        config: Record<string, unknown> = {},
    ): Promise<void> {
        if (!this.isInitialized) {
            await this.init();
        }

        try {
            await this.client.mount({
                mount_point: mountPoint,
                type: type,
                config: config,
            });
            Logger.info(`✅ Engine ${type} mounted at ${mountPoint}`);
        } catch (error) {
            Logger.error(`Failed to create new engine at ${mountPoint}`, error);
            throw error;
        }
    }

    // Enable Transit engine
    async enableTransitEngine(mountPoint: string = "transit"): Promise<void> {
        if (!this.isInitialized) {
            await this.init();
        }

        try {
            // Check if transit engine is already enabled
            const mounts = await this.client.mounts();
            const transitPath = `${mountPoint}/`;

            if (mounts.data[transitPath]) {
                Logger.info(`Transit engine already enabled at ${mountPoint}`);
                return;
            }

            // Enable transit engine
            await this.createNewEngine(mountPoint, "transit");
            Logger.info(`✅ Transit engine enabled at ${mountPoint}`);
        } catch (error) {
            Logger.error("Failed to enable transit engine", error);
            throw error;
        }
    }

    // Create encryption key for Transit engine
    async createEncryptionKey(
        keyName: string,
        mountPoint: string = "transit",
        options: {
            type?: string; // aes256-gcm96, chacha20-poly1305, etc.
            convergent_encryption?: boolean;
            derived?: boolean;
        } = {},
    ): Promise<void> {
        if (!this.isInitialized) {
            await this.init();
        }

        try {
            // Check if key already exists
            try {
                await this.client.read(`${mountPoint}/keys/${keyName}`);
                Logger.info(`Encryption key '${keyName}' already exists`);
                return;
            } catch {
                // Key doesn't exist, continue to create it
            }

            // Create the key with options
            await this.client.write(`${mountPoint}/keys/${keyName}`, options);
            Logger.info(
                `✅ Encryption key '${keyName}' created at ${mountPoint}`,
            );
        } catch (error) {
            Logger.error(`Failed to create encryption key ${keyName}`, error);
            throw error;
        }
    }

    // Setup Transit engine with default key (convenience method)
    async setupTransit(
        mountPoint: string = "transit",
        defaultKeyName: string = "user-data",
    ): Promise<void> {
        if (!this.isInitialized) {
            await this.init();
        }

        try {
            Logger.info("🔧 Setting up Transit engine...");

            // Enable transit engine
            await this.enableTransitEngine(mountPoint);

            // Create default encryption key
            await this.createEncryptionKey(defaultKeyName, mountPoint, {
                type: "aes256-gcm96",
                derived: true, // Allows context-based encryption
            });

            Logger.info("✅ Transit engine setup complete!");
            Logger.info(`   Mount point: ${mountPoint}`);
            Logger.info(`   Default key: ${defaultKeyName}`);
        } catch (error) {
            Logger.error("Failed to setup transit engine", error);
            throw error;
        }
    }

    async encrypt({
        keyName,
        plaintext,
        context,
        mountPoint = "transit",
    }: {
        keyName: string;
        plaintext: string;
        context?: string;
        mountPoint?: string;
    }): Promise<string> {
        if (!this.isInitialized) {
            await this.init();
        }

        try {
            // Vault expects base64 encoded plaintext
            const base64Plaintext = Buffer.from(plaintext.toString()).toString(
                "base64",
            );

            const payload: Record<string, unknown> = {
                plaintext: base64Plaintext,
            };

            // Si un contexte est fourni, l'encoder en base64
            if (context) {
                payload.context = Buffer.from(context).toString("base64");
            }

            const result = await this.client.write(
                `${mountPoint}/encrypt/${keyName}`,
                payload,
            );

            return result.data.ciphertext;
        } catch (error) {
            Logger.error(`Failed to encrypt data with key ${keyName}`, error);
            throw error;
        }
    }

    // Déchiffrer avec contexte utilisateur
    async decrypt(
        keyName: string,
        ciphertext: string,
        context?: string, // Ajout du paramètre context
        mountPoint: string = "transit",
    ): Promise<string> {
        if (!this.isInitialized) {
            await this.init();
        }

        try {
            const payload: Record<string, unknown> = {
                ciphertext: ciphertext,
            };

            // Si un contexte est fourni, l'encoder en base64
            if (context) {
                payload.context = Buffer.from(context).toString("base64");
            }

            const result = await this.client.write(
                `${mountPoint}/decrypt/${keyName}`,
                payload,
            );

            // Decode from base64
            const decrypted = Buffer.from(
                result.data.plaintext,
                "base64",
            ).toString("utf-8");

            return decrypted;
        } catch (error) {
            Logger.error(`Failed to decrypt data with key ${keyName}`, error);
            throw error;
        }
    }

    async encryptFields({
        keyName,
        data,
        context,
        mountPoint = "transit",
    }: {
        keyName: string;
        data: Record<string, unknown>;
        context?: string;
        mountPoint?: string;
    }): Promise<Record<string, unknown>> {
        if (!this.isInitialized) {
            await this.init();
        }

        const encryptedData: Record<string, unknown> = {};

        // Chiffrer chaque valeur individuellement
        for (const [key, value] of Object.entries(data)) {
            if (value === null || value === undefined) {
                encryptedData[key] = value;
                continue;
            }

            try {
                // Convertir la valeur en string pour le chiffrement
                const stringValue =
                    typeof value === "string" ? value : JSON.stringify(value);

                encryptedData[key] = await this.encrypt({
                    keyName,
                    plaintext: stringValue,
                    context,
                    mountPoint,
                });
            } catch (error) {
                Logger.error(`Failed to encrypt field ${key}`, error);
                throw error;
            }
        }

        return encryptedData;
    }

    // Déchiffrer plusieurs champs individuellement
    async decryptFields<T = Record<string, unknown>>({
        keyName,
        encryptedData,
        context,
        mountPoint = "transit",
    }: {
        keyName: string;
        encryptedData: Record<string, unknown>;
        context?: string;
        mountPoint?: string;
    }): Promise<T> {
        if (!this.isInitialized) {
            await this.init();
        }

        const decryptedData: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(encryptedData)) {
            if (value === null || value === undefined) {
                decryptedData[key] = value;
                continue;
            }

            try {
                // Déchiffrer seulement si la valeur commence par "vault:"
                if (typeof value === "string" && value.startsWith("vault:")) {
                    const decrypted = await this.decrypt(
                        keyName,
                        value,
                        context,
                        mountPoint,
                    );

                    // Essayer de parser le JSON si c'était un objet/array
                    try {
                        decryptedData[key] = JSON.parse(decrypted);
                    } catch {
                        // Si ce n'est pas du JSON, garder la string
                        decryptedData[key] = decrypted;
                    }
                } else {
                    // Champ non chiffré
                    decryptedData[key] = value;
                }
            } catch (error) {
                Logger.error(`Failed to decrypt field ${key}`, error);
                throw error;
            }
        }

        return decryptedData as T;
    }
}

export default new VaultService();
