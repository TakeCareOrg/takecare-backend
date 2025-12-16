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
        } catch (error) {
            Logger.error(`Failed to create new engine at ${mountPoint}`, error);
            throw error;
        }
    }
}

export default new VaultService();
