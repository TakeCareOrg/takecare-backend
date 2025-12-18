import Logger from "../../src/libs/logger";

jest.mock("../../src/libs/logger");

// Mock node-vault before importing VaultService
const mockVaultClient = {
    status: jest.fn(),
    health: jest.fn(),
    unseal: jest.fn(),
    read: jest.fn(),
    write: jest.fn(),
    delete: jest.fn(),
    list: jest.fn(),
    mount: jest.fn(),
    mounts: jest.fn(),
};

jest.mock("node-vault", () => {
    return jest.fn(() => mockVaultClient);
});

// Import VaultService after mocks are set up
import VaultService from "../../src/services/vault";

describe("Vault Service Tests", () => {
    beforeEach(() => {
        // Setup environment variables
        process.env.VAULT_ADDR = "http://localhost:8200";
        process.env.VAULT_TOKEN = "test-token";

        // Clear all mock calls
        jest.clearAllMocks();

        // Reset mock implementations
        mockVaultClient.status.mockReset();
        mockVaultClient.health.mockReset();
        mockVaultClient.unseal.mockReset();
        mockVaultClient.read.mockReset();
        mockVaultClient.write.mockReset();
        mockVaultClient.delete.mockReset();
        mockVaultClient.list.mockReset();
        mockVaultClient.mount.mockReset();
        mockVaultClient.mounts.mockReset();

        // Reset the VaultService instance state
        // @ts-expect-error - Accessing private property for testing
        VaultService.isInitialized = false;
    });

    afterEach(() => {
        delete process.env.VAULT_ADDR;
        delete process.env.VAULT_TOKEN;
        delete process.env.VAULT_UNSEAL_KEY_1;
        delete process.env.VAULT_UNSEAL_KEY_2;
        delete process.env.VAULT_UNSEAL_KEY_3;
        delete process.env.VAULT_UNSEAL_KEY_4;
        delete process.env.VAULT_UNSEAL_KEY_5;
    });

    describe("init", () => {
        it("should initialize successfully when vault is unsealed", async () => {
            mockVaultClient.status.mockResolvedValue({
                sealed: false,
                progress: 0,
                t: 3,
            });
            mockVaultClient.health.mockResolvedValue({ initialized: true });

            await VaultService.init();

            expect(mockVaultClient.status).toHaveBeenCalled();
            expect(mockVaultClient.health).toHaveBeenCalled();
            expect(Logger.debug).toHaveBeenCalledWith("Connected to Vault", {
                initialized: true,
            });
        });

        it("should unseal vault when it is sealed", async () => {
            process.env.VAULT_UNSEAL_KEY_1 = "key1";
            process.env.VAULT_UNSEAL_KEY_2 = "key2";

            mockVaultClient.status.mockResolvedValue({
                sealed: true,
                progress: 0,
                t: 3,
            });
            mockVaultClient.unseal
                .mockResolvedValueOnce({ sealed: true })
                .mockResolvedValueOnce({ sealed: false });
            mockVaultClient.health.mockResolvedValue({ initialized: true });

            await VaultService.init();

            expect(Logger.warn).toHaveBeenCalledWith(
                "🔒 Vault is sealed, attempting to unseal...",
            );
            expect(mockVaultClient.unseal).toHaveBeenCalledTimes(2);
            expect(mockVaultClient.unseal).toHaveBeenCalledWith({
                secret_shares: 1,
                key: "key1",
            });
            expect(mockVaultClient.unseal).toHaveBeenCalledWith({
                secret_shares: 1,
                key: "key2",
            });
        });

        it("should throw error when unsealing fails", async () => {
            process.env.VAULT_UNSEAL_KEY_1 = "invalid-key";

            mockVaultClient.status.mockResolvedValue({
                sealed: true,
                progress: 0,
                t: 3,
            });
            const unsealError = new Error("Unseal failed");
            mockVaultClient.unseal.mockRejectedValue(unsealError);

            await expect(VaultService.init()).rejects.toThrow("Unseal failed");
            expect(Logger.error).toHaveBeenCalledWith(
                "Failed to unseal Vault",
                unsealError,
            );
        });

        it("should log success when vault is unsealed successfully", async () => {
            process.env.VAULT_UNSEAL_KEY_1 = "key1";

            mockVaultClient.status.mockResolvedValue({
                sealed: true,
                progress: 0,
                t: 3,
            });
            mockVaultClient.unseal.mockResolvedValue({ sealed: false });
            mockVaultClient.health.mockResolvedValue({ initialized: true });

            await VaultService.init();

            expect(Logger.info).toHaveBeenCalledWith(
                "✅ Vault unsealed successfully",
            );
        });
    });

    describe("getSealStatus", () => {
        it("should return seal status successfully", async () => {
            mockVaultClient.status.mockResolvedValue({
                sealed: false,
                progress: 0,
                t: 3,
            });

            const status = await VaultService.getSealStatus();

            expect(status).toEqual({
                sealed: false,
                progress: 0,
                threshold: 3,
            });
        });

        it("should throw error when getting seal status fails", async () => {
            const error = new Error("Status check failed");
            mockVaultClient.status.mockRejectedValue(error);

            await expect(VaultService.getSealStatus()).rejects.toThrow(
                "Status check failed",
            );
            expect(Logger.error).toHaveBeenCalledWith(
                "Failed to get seal status",
                error,
            );
        });
    });

    describe("getSecret", () => {
        beforeEach(async () => {
            mockVaultClient.status.mockResolvedValue({ sealed: false });
            mockVaultClient.health.mockResolvedValue({ initialized: true });
        });

        it("should get secret successfully", async () => {
            const secretData = { username: "test", password: "secret123" };
            mockVaultClient.read.mockResolvedValue({
                data: { data: secretData },
            });

            const result = await VaultService.getSecret("secret/path");

            expect(mockVaultClient.read).toHaveBeenCalledWith("secret/path");
            expect(result).toEqual(secretData);
        });

        it("should throw error when reading secret fails", async () => {
            const error = new Error("Read failed");
            mockVaultClient.read.mockRejectedValue(error);

            await expect(VaultService.getSecret("secret/path")).rejects.toThrow(
                "Read failed",
            );
            expect(Logger.error).toHaveBeenCalledWith(
                "Failed to read secret from secret/path",
                error,
            );
        });
    });

    describe("setSecret", () => {
        beforeEach(async () => {
            mockVaultClient.status.mockResolvedValue({ sealed: false });
            mockVaultClient.health.mockResolvedValue({ initialized: true });
        });

        it("should set secret successfully", async () => {
            const secretData = { username: "test", password: "secret123" };
            mockVaultClient.write.mockResolvedValue({ data: {} });

            await VaultService.setSecret("secret/path", secretData);

            expect(mockVaultClient.write).toHaveBeenCalledWith("secret/path", {
                data: secretData,
            });
            expect(Logger.info).toHaveBeenCalledWith(
                "Secret written to secret/path",
            );
        });

        it("should throw error when writing secret fails", async () => {
            const error = new Error("Write failed");
            mockVaultClient.write.mockRejectedValue(error);

            await expect(
                VaultService.setSecret("secret/path", { key: "value" }),
            ).rejects.toThrow("Write failed");
            expect(Logger.error).toHaveBeenCalledWith(
                "Failed to write secret to secret/path",
                error,
            );
        });
    });

    describe("deleteSecret", () => {
        beforeEach(async () => {
            mockVaultClient.status.mockResolvedValue({ sealed: false });
            mockVaultClient.health.mockResolvedValue({ initialized: true });
        });

        it("should delete secret successfully", async () => {
            mockVaultClient.delete.mockResolvedValue({});

            await VaultService.deleteSecret("secret/path");

            expect(mockVaultClient.delete).toHaveBeenCalledWith("secret/path");
            expect(Logger.info).toHaveBeenCalledWith(
                "Secret deleted from secret/path",
            );
        });

        it("should throw error when deleting secret fails", async () => {
            const error = new Error("Delete failed");
            mockVaultClient.delete.mockRejectedValue(error);

            await expect(
                VaultService.deleteSecret("secret/path"),
            ).rejects.toThrow("Delete failed");
            expect(Logger.error).toHaveBeenCalledWith(
                "Failed to delete secret from secret/path",
                error,
            );
        });
    });

    describe("listSecrets", () => {
        beforeEach(async () => {
            mockVaultClient.status.mockResolvedValue({ sealed: false });
            mockVaultClient.health.mockResolvedValue({ initialized: true });
        });

        it("should list secrets successfully", async () => {
            const keys = ["secret1", "secret2", "secret3"];
            mockVaultClient.list.mockResolvedValue({
                data: { keys },
            });

            const result = await VaultService.listSecrets("secret/path");

            expect(mockVaultClient.list).toHaveBeenCalledWith("secret/path");
            expect(result).toEqual(keys);
        });

        it("should throw error when listing secrets fails", async () => {
            const error = new Error("List failed");
            mockVaultClient.list.mockRejectedValue(error);

            await expect(
                VaultService.listSecrets("secret/path"),
            ).rejects.toThrow("List failed");
            expect(Logger.error).toHaveBeenCalledWith(
                "Failed to list secrets at secret/path",
                error,
            );
        });
    });

    describe("createNewEngine", () => {
        beforeEach(async () => {
            mockVaultClient.status.mockResolvedValue({ sealed: false });
            mockVaultClient.health.mockResolvedValue({ initialized: true });
        });

        it("should create new engine successfully with defaults", async () => {
            mockVaultClient.mount.mockResolvedValue({});

            await VaultService.createNewEngine("secret");

            expect(mockVaultClient.mount).toHaveBeenCalledWith({
                mount_point: "secret",
                type: "kv",
                config: {},
            });
            expect(Logger.info).toHaveBeenCalledWith(
                "✅ Engine kv mounted at secret",
            );
        });

        it("should create new engine successfully with custom config", async () => {
            mockVaultClient.mount.mockResolvedValue({});
            const config = { version: "2" };

            await VaultService.createNewEngine("secret", "kv-v2", config);

            expect(mockVaultClient.mount).toHaveBeenCalledWith({
                mount_point: "secret",
                type: "kv-v2",
                config,
            });
            expect(Logger.info).toHaveBeenCalledWith(
                "✅ Engine kv-v2 mounted at secret",
            );
        });

        it("should throw error when creating engine fails", async () => {
            const error = new Error("Mount failed");
            mockVaultClient.mount.mockRejectedValue(error);

            await expect(
                VaultService.createNewEngine("secret"),
            ).rejects.toThrow("Mount failed");
            expect(Logger.error).toHaveBeenCalledWith(
                "Failed to create new engine at secret",
                error,
            );
        });
    });

    describe("enableTransitEngine", () => {
        beforeEach(async () => {
            mockVaultClient.status.mockResolvedValue({ sealed: false });
            mockVaultClient.health.mockResolvedValue({ initialized: true });
        });

        it("should enable transit engine when not already enabled", async () => {
            mockVaultClient.mounts.mockResolvedValue({
                data: {},
            });
            mockVaultClient.mount.mockResolvedValue({});

            await VaultService.enableTransitEngine("transit");

            expect(mockVaultClient.mounts).toHaveBeenCalled();
            expect(mockVaultClient.mount).toHaveBeenCalledWith({
                mount_point: "transit",
                type: "transit",
                config: {},
            });
            expect(Logger.info).toHaveBeenCalledWith(
                "✅ Transit engine enabled at transit",
            );
        });

        it("should skip enabling when transit engine already exists", async () => {
            mockVaultClient.mounts.mockResolvedValue({
                data: {
                    "transit/": { type: "transit" },
                },
            });

            await VaultService.enableTransitEngine("transit");

            expect(mockVaultClient.mount).not.toHaveBeenCalled();
            expect(Logger.info).toHaveBeenCalledWith(
                "Transit engine already enabled at transit",
            );
        });

        it("should throw error when enabling transit engine fails", async () => {
            const error = new Error("Enable failed");
            mockVaultClient.mounts.mockRejectedValue(error);

            await expect(VaultService.enableTransitEngine()).rejects.toThrow(
                "Enable failed",
            );
            expect(Logger.error).toHaveBeenCalledWith(
                "Failed to enable transit engine",
                error,
            );
        });
    });

    describe("createEncryptionKey", () => {
        beforeEach(async () => {
            mockVaultClient.status.mockResolvedValue({ sealed: false });
            mockVaultClient.health.mockResolvedValue({ initialized: true });
        });

        it("should create encryption key successfully", async () => {
            mockVaultClient.read.mockRejectedValue(new Error("Not found"));
            mockVaultClient.write.mockResolvedValue({});

            await VaultService.createEncryptionKey("my-key", "transit");

            expect(mockVaultClient.write).toHaveBeenCalledWith(
                "transit/keys/my-key",
                {},
            );
            expect(Logger.info).toHaveBeenCalledWith(
                "✅ Encryption key 'my-key' created at transit",
            );
        });

        it("should skip creating key when it already exists", async () => {
            mockVaultClient.read.mockResolvedValue({
                data: { name: "my-key" },
            });

            await VaultService.createEncryptionKey("my-key");

            expect(mockVaultClient.write).not.toHaveBeenCalled();
            expect(Logger.info).toHaveBeenCalledWith(
                "Encryption key 'my-key' already exists",
            );
        });

        it("should create key with custom options", async () => {
            mockVaultClient.read.mockRejectedValue(new Error("Not found"));
            mockVaultClient.write.mockResolvedValue({});

            const options = {
                type: "aes256-gcm96",
                derived: true,
                convergent_encryption: true,
            };

            await VaultService.createEncryptionKey(
                "my-key",
                "transit",
                options,
            );

            expect(mockVaultClient.write).toHaveBeenCalledWith(
                "transit/keys/my-key",
                options,
            );
        });

        it("should throw error when creating encryption key fails", async () => {
            mockVaultClient.read.mockRejectedValue(new Error("Not found"));
            const error = new Error("Create failed");
            mockVaultClient.write.mockRejectedValue(error);

            await expect(
                VaultService.createEncryptionKey("my-key"),
            ).rejects.toThrow("Create failed");
            expect(Logger.error).toHaveBeenCalledWith(
                "Failed to create encryption key my-key",
                error,
            );
        });
    });

    describe("setupTransit", () => {
        beforeEach(async () => {
            mockVaultClient.status.mockResolvedValue({ sealed: false });
            mockVaultClient.health.mockResolvedValue({ initialized: true });
        });

        it("should setup transit engine successfully", async () => {
            mockVaultClient.mounts.mockResolvedValue({
                data: {},
            });
            mockVaultClient.mount.mockResolvedValue({});
            mockVaultClient.read.mockRejectedValue(new Error("Not found"));
            mockVaultClient.write.mockResolvedValue({});

            await VaultService.setupTransit("transit", "user-data");

            expect(Logger.info).toHaveBeenCalledWith(
                "🔧 Setting up Transit engine...",
            );
            expect(mockVaultClient.mount).toHaveBeenCalled();
            expect(mockVaultClient.write).toHaveBeenCalledWith(
                "transit/keys/user-data",
                {
                    type: "aes256-gcm96",
                    derived: true,
                },
            );
            expect(Logger.info).toHaveBeenCalledWith(
                "✅ Transit engine setup complete!",
            );
        });

        it("should throw error when setup fails", async () => {
            const error = new Error("Setup failed");
            mockVaultClient.mounts.mockRejectedValue(error);

            await expect(VaultService.setupTransit()).rejects.toThrow(
                "Setup failed",
            );
            expect(Logger.error).toHaveBeenCalledWith(
                "Failed to setup transit engine",
                error,
            );
        });
    });

    describe("encrypt", () => {
        beforeEach(async () => {
            mockVaultClient.status.mockResolvedValue({ sealed: false });
            mockVaultClient.health.mockResolvedValue({ initialized: true });
        });

        it("should encrypt plaintext successfully", async () => {
            const ciphertext = "vault:v1:encrypted-data";
            mockVaultClient.write.mockResolvedValue({
                data: { ciphertext },
            });

            const result = await VaultService.encrypt({
                keyName: "my-key",
                plaintext: "sensitive data",
            });

            expect(mockVaultClient.write).toHaveBeenCalledWith(
                "transit/encrypt/my-key",
                {
                    plaintext: Buffer.from("sensitive data").toString("base64"),
                },
            );
            expect(result).toBe(ciphertext);
        });

        it("should encrypt with context", async () => {
            const ciphertext = "vault:v1:encrypted-data";
            mockVaultClient.write.mockResolvedValue({
                data: { ciphertext },
            });

            const result = await VaultService.encrypt({
                keyName: "my-key",
                plaintext: "sensitive data",
                context: "user:123",
            });

            expect(mockVaultClient.write).toHaveBeenCalledWith(
                "transit/encrypt/my-key",
                {
                    plaintext: Buffer.from("sensitive data").toString("base64"),
                    context: Buffer.from("user:123").toString("base64"),
                },
            );
            expect(result).toBe(ciphertext);
        });

        it("should encrypt with custom mount point", async () => {
            const ciphertext = "vault:v1:encrypted-data";
            mockVaultClient.write.mockResolvedValue({
                data: { ciphertext },
            });

            await VaultService.encrypt({
                keyName: "my-key",
                plaintext: "sensitive data",
                mountPoint: "custom-transit",
            });

            expect(mockVaultClient.write).toHaveBeenCalledWith(
                "custom-transit/encrypt/my-key",
                expect.any(Object),
            );
        });

        it("should throw error when encryption fails", async () => {
            const error = new Error("Encryption failed");
            mockVaultClient.write.mockRejectedValue(error);

            await expect(
                VaultService.encrypt({
                    keyName: "my-key",
                    plaintext: "sensitive data",
                }),
            ).rejects.toThrow("Encryption failed");
            expect(Logger.error).toHaveBeenCalledWith(
                "Failed to encrypt data with key my-key",
                error,
            );
        });
    });

    describe("decrypt", () => {
        beforeEach(async () => {
            mockVaultClient.status.mockResolvedValue({ sealed: false });
            mockVaultClient.health.mockResolvedValue({ initialized: true });
        });

        it("should decrypt ciphertext successfully", async () => {
            const plaintext = "sensitive data";
            mockVaultClient.write.mockResolvedValue({
                data: { plaintext: Buffer.from(plaintext).toString("base64") },
            });

            const result = await VaultService.decrypt({
                keyName: "my-key",
                ciphertext: "vault:v1:encrypted-data",
            });

            expect(mockVaultClient.write).toHaveBeenCalledWith(
                "transit/decrypt/my-key",
                {
                    ciphertext: "vault:v1:encrypted-data",
                },
            );
            expect(result).toBe(plaintext);
        });

        it("should decrypt with context", async () => {
            const plaintext = "sensitive data";
            mockVaultClient.write.mockResolvedValue({
                data: { plaintext: Buffer.from(plaintext).toString("base64") },
            });

            await VaultService.decrypt({
                keyName: "my-key",
                ciphertext: "vault:v1:encrypted-data",
                context: "user:123",
            });

            expect(mockVaultClient.write).toHaveBeenCalledWith(
                "transit/decrypt/my-key",
                {
                    ciphertext: "vault:v1:encrypted-data",
                    context: Buffer.from("user:123").toString("base64"),
                },
            );
        });

        it("should decrypt with custom mount point", async () => {
            const plaintext = "sensitive data";
            mockVaultClient.write.mockResolvedValue({
                data: { plaintext: Buffer.from(plaintext).toString("base64") },
            });

            await VaultService.decrypt({
                keyName: "my-key",
                ciphertext: "vault:v1:encrypted-data",
                mountPoint: "custom-transit",
            });

            expect(mockVaultClient.write).toHaveBeenCalledWith(
                "custom-transit/decrypt/my-key",
                expect.any(Object),
            );
        });

        it("should throw error when decryption fails", async () => {
            const error = new Error("Decryption failed");
            mockVaultClient.write.mockRejectedValue(error);

            await expect(
                VaultService.decrypt({
                    keyName: "my-key",
                    ciphertext: "vault:v1:encrypted-data",
                }),
            ).rejects.toThrow("Decryption failed");
            expect(Logger.error).toHaveBeenCalledWith(
                "Failed to decrypt data with key my-key",
                error,
            );
        });
    });

    describe("encryptFields", () => {
        beforeEach(async () => {
            mockVaultClient.status.mockResolvedValue({ sealed: false });
            mockVaultClient.health.mockResolvedValue({ initialized: true });
        });

        it("should encrypt all fields in an object", async () => {
            mockVaultClient.write
                .mockResolvedValueOnce({
                    data: { ciphertext: "vault:v1:encrypted-name" },
                })
                .mockResolvedValueOnce({
                    data: { ciphertext: "vault:v1:encrypted-email" },
                });

            const data = {
                name: "John Doe",
                email: "john@example.com",
            };

            const result = await VaultService.encryptFields({
                keyName: "my-key",
                data,
            });

            expect(mockVaultClient.write).toHaveBeenCalledTimes(2);
            expect(result).toEqual({
                name: "vault:v1:encrypted-name",
                email: "vault:v1:encrypted-email",
            });
        });

        it("should handle null and undefined values", async () => {
            const data = {
                name: "John",
                age: null,
                address: undefined,
            };

            mockVaultClient.write.mockResolvedValue({
                data: { ciphertext: "vault:v1:encrypted-name" },
            });

            const result = await VaultService.encryptFields({
                keyName: "my-key",
                data,
            });

            expect(mockVaultClient.write).toHaveBeenCalledTimes(1);
            expect(result).toEqual({
                name: "vault:v1:encrypted-name",
                age: null,
                address: undefined,
            });
        });

        it("should stringify non-string values", async () => {
            mockVaultClient.write.mockResolvedValue({
                data: { ciphertext: "vault:v1:encrypted-data" },
            });

            const data = {
                count: 42,
                active: true,
                metadata: { key: "value" },
            };

            await VaultService.encryptFields({
                keyName: "my-key",
                data,
            });

            expect(mockVaultClient.write).toHaveBeenCalledWith(
                "transit/encrypt/my-key",
                {
                    plaintext: Buffer.from("42").toString("base64"),
                },
            );
        });

        it("should encrypt with context", async () => {
            mockVaultClient.write.mockResolvedValue({
                data: { ciphertext: "vault:v1:encrypted-data" },
            });

            await VaultService.encryptFields({
                keyName: "my-key",
                data: { field: "value" },
                context: "user:123",
            });

            expect(mockVaultClient.write).toHaveBeenCalledWith(
                "transit/encrypt/my-key",
                {
                    plaintext: expect.any(String),
                    context: Buffer.from("user:123").toString("base64"),
                },
            );
        });

        it("should throw error when field encryption fails", async () => {
            const error = new Error("Encryption failed");
            mockVaultClient.write.mockRejectedValue(error);

            await expect(
                VaultService.encryptFields({
                    keyName: "my-key",
                    data: { field: "value" },
                }),
            ).rejects.toThrow("Encryption failed");
            expect(Logger.error).toHaveBeenCalledWith(
                "Failed to encrypt field field",
                error,
            );
        });
    });

    describe("decryptFields", () => {
        beforeEach(async () => {
            mockVaultClient.status.mockResolvedValue({ sealed: false });
            mockVaultClient.health.mockResolvedValue({ initialized: true });
        });

        it("should decrypt all encrypted fields in an object", async () => {
            mockVaultClient.write
                .mockResolvedValueOnce({
                    data: {
                        plaintext: Buffer.from("John Doe").toString("base64"),
                    },
                })
                .mockResolvedValueOnce({
                    data: {
                        plaintext:
                            Buffer.from("john@example.com").toString("base64"),
                    },
                });

            const encryptedData = {
                name: "vault:v1:encrypted-name",
                email: "vault:v1:encrypted-email",
            };

            const result = await VaultService.decryptFields({
                keyName: "my-key",
                encryptedData,
            });

            expect(mockVaultClient.write).toHaveBeenCalledTimes(2);
            expect(result).toEqual({
                name: "John Doe",
                email: "john@example.com",
            });
        });

        it("should handle null and undefined values", async () => {
            const encryptedData = {
                name: "vault:v1:encrypted-name",
                age: null,
                address: undefined,
            };

            mockVaultClient.write.mockResolvedValue({
                data: {
                    plaintext: Buffer.from("John").toString("base64"),
                },
            });

            const result = await VaultService.decryptFields({
                keyName: "my-key",
                encryptedData,
            });

            expect(mockVaultClient.write).toHaveBeenCalledTimes(1);
            expect(result).toEqual({
                name: "John",
                age: null,
                address: undefined,
            });
        });

        it("should skip non-encrypted fields", async () => {
            const data = {
                encryptedField: "vault:v1:encrypted-data",
                plainField: "plain text",
                numberField: 42,
            };

            mockVaultClient.write.mockResolvedValue({
                data: {
                    plaintext: Buffer.from("decrypted").toString("base64"),
                },
            });

            const result = await VaultService.decryptFields({
                keyName: "my-key",
                encryptedData: data,
            });

            expect(mockVaultClient.write).toHaveBeenCalledTimes(1);
            expect(result).toEqual({
                encryptedField: "decrypted",
                plainField: "plain text",
                numberField: 42,
            });
        });

        it("should parse JSON when decrypted value is JSON", async () => {
            mockVaultClient.write.mockResolvedValue({
                data: {
                    plaintext: Buffer.from(
                        JSON.stringify({ key: "value" }),
                    ).toString("base64"),
                },
            });

            const result = await VaultService.decryptFields({
                keyName: "my-key",
                encryptedData: { field: "vault:v1:encrypted-json" },
            });

            expect(result).toEqual({
                field: { key: "value" },
            });
        });

        it("should keep as string when decrypted value is not JSON", async () => {
            mockVaultClient.write.mockResolvedValue({
                data: {
                    plaintext: Buffer.from("not json").toString("base64"),
                },
            });

            const result = await VaultService.decryptFields({
                keyName: "my-key",
                encryptedData: { field: "vault:v1:encrypted-text" },
            });

            expect(result).toEqual({
                field: "not json",
            });
        });

        it("should decrypt with context", async () => {
            mockVaultClient.write.mockResolvedValue({
                data: {
                    plaintext: Buffer.from("decrypted").toString("base64"),
                },
            });

            await VaultService.decryptFields({
                keyName: "my-key",
                encryptedData: { field: "vault:v1:encrypted-data" },
                context: "user:123",
            });

            expect(mockVaultClient.write).toHaveBeenCalledWith(
                "transit/decrypt/my-key",
                {
                    ciphertext: "vault:v1:encrypted-data",
                    context: Buffer.from("user:123").toString("base64"),
                },
            );
        });

        it("should throw error when field decryption fails", async () => {
            const error = new Error("Decryption failed");
            mockVaultClient.write.mockRejectedValue(error);

            await expect(
                VaultService.decryptFields({
                    keyName: "my-key",
                    encryptedData: { field: "vault:v1:encrypted-data" },
                }),
            ).rejects.toThrow("Decryption failed");
            expect(Logger.error).toHaveBeenCalledWith(
                "Failed to decrypt field field",
                error,
            );
        });
    });
});
