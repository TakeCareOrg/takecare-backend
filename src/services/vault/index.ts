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
            const sealStatus = await this.client.status();

            if (sealStatus.sealed) {
                Logger.warn("🔒 Vault is sealed, attempting to unseal...");

                for (let i = 1; i <= 5; i++) {
                    const key = process.env[`VAULT_UNSEAL_KEY_${i}`];
                    if (key) {
                        await this.unsealVault(key);
                    }
                }
            }

            const health = await this.client.health();
            Logger.debug("Connected to Vault", health);
            this.isInitialized = true;
        } catch (error) {
            Logger.error("Failed to connect to Vault", error);
            throw error;
        }
    }

    private async ensureInitialized(): Promise<void> {
        if (!this.isInitialized) {
            await this.init();
        }
    }

    private async unsealVault(key: string): Promise<void> {
        try {
            const result = await this.client.unseal({
                secret_shares: 1,
                key: key,
            });

            if (!result.sealed) {
                Logger.info("✅ Vault unsealed successfully");
            }
        } catch (error) {
            Logger.error("Failed to unseal Vault", error);
            throw error;
        }
    }

    private toBase64(value: string): string {
        return Buffer.from(value).toString("base64");
    }

    private fromBase64(value: string): string {
        return Buffer.from(value, "base64").toString("utf-8");
    }

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

    async getSecret<T = Record<string, unknown>>(path: string): Promise<T> {
        await this.ensureInitialized();
        try {
            const result = await this.client.read(path);
            return result.data.data as T;
        } catch (error) {
            Logger.error(`Failed to read secret from ${path}`, error);
            throw error;
        }
    }

    async setSecret(
        path: string,
        data: Record<string, unknown>,
    ): Promise<NodeVault.client["write"]> {
        await this.ensureInitialized();
        try {
            const result = await this.client.write(path, { data });
            Logger.info(`Secret written to ${path}`);
            return result.data;
        } catch (error) {
            Logger.error(`Failed to write secret to ${path}`, error);
            throw error;
        }
    }

    async deleteSecret(path: string): Promise<void> {
        await this.ensureInitialized();
        try {
            await this.client.delete(path);
            Logger.info(`Secret deleted from ${path}`);
        } catch (error) {
            Logger.error(`Failed to delete secret from ${path}`, error);
            throw error;
        }
    }

    async listSecrets(path: string): Promise<string[]> {
        await this.ensureInitialized();
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
        await this.ensureInitialized();
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

    async enableTransitEngine(mountPoint: string = "transit"): Promise<void> {
        await this.ensureInitialized();
        try {
            const mounts = await this.client.mounts();
            const transitPath = `${mountPoint}/`;

            if (mounts.data[transitPath]) {
                Logger.info(`Transit engine already enabled at ${mountPoint}`);
                return;
            }

            await this.createNewEngine(mountPoint, "transit");
            Logger.info(`✅ Transit engine enabled at ${mountPoint}`);
        } catch (error) {
            Logger.error("Failed to enable transit engine", error);
            throw error;
        }
    }

    async createEncryptionKey(
        keyName: string,
        mountPoint: string = "transit",
        options: {
            type?: string;
            convergent_encryption?: boolean;
            derived?: boolean;
        } = {},
    ): Promise<void> {
        await this.ensureInitialized();
        try {
            try {
                await this.client.read(`${mountPoint}/keys/${keyName}`);
                Logger.info(`Encryption key '${keyName}' already exists`);
                return;
            } catch {
                // Key doesn't exist, continue
            }

            await this.client.write(`${mountPoint}/keys/${keyName}`, options);
            Logger.info(
                `✅ Encryption key '${keyName}' created at ${mountPoint}`,
            );
        } catch (error) {
            Logger.error(`Failed to create encryption key ${keyName}`, error);
            throw error;
        }
    }

    async setupTransit(
        mountPoint: string = "transit",
        defaultKeyName: string = "user-data",
    ): Promise<void> {
        await this.ensureInitialized();
        try {
            Logger.info("🔧 Setting up Transit engine...");

            await this.enableTransitEngine(mountPoint);
            await this.createEncryptionKey(defaultKeyName, mountPoint, {
                type: "aes256-gcm96",
                derived: true,
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
        await this.ensureInitialized();
        try {
            const payload: Record<string, string> = {
                plaintext: this.toBase64(plaintext),
            };

            if (context) {
                payload.context = this.toBase64(context);
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

    async decrypt({
        keyName,
        ciphertext,
        context,
        mountPoint = "transit",
    }: {
        keyName: string;
        ciphertext: string;
        context?: string;
        mountPoint?: string;
    }): Promise<string> {
        await this.ensureInitialized();
        try {
            const payload: Record<string, string> = { ciphertext };

            if (context) {
                payload.context = this.toBase64(context);
            }

            const result = await this.client.write(
                `${mountPoint}/decrypt/${keyName}`,
                payload,
            );

            return this.fromBase64(result.data.plaintext);
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
        await this.ensureInitialized();

        const encryptedData: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(data)) {
            if (value === null || value === undefined) {
                encryptedData[key] = value;
                continue;
            }

            try {
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
        await this.ensureInitialized();

        const decryptedData: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(encryptedData)) {
            if (value === null || value === undefined) {
                decryptedData[key] = value;
                continue;
            }

            try {
                if (typeof value === "string" && value.startsWith("vault:")) {
                    const decrypted = await this.decrypt({
                        keyName,
                        ciphertext: value,
                        context,
                        mountPoint,
                    });

                    try {
                        decryptedData[key] = JSON.parse(decrypted);
                    } catch {
                        decryptedData[key] = decrypted;
                    }
                } else {
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
