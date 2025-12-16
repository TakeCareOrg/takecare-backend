// Script to setup Vault Transit engine for encryption
import dotenv from "dotenv";

// Load environment variables FIRST before any other imports
dotenv.config();

import vaultService from "@services/vault";
import Logger from "@libs/logger";

async function setupTransit() {
    try {
        Logger.info("🚀 Starting Vault Transit Engine setup...");

        // Initialize Vault connection
        await vaultService.init();

        // Setup Transit engine with default configuration
        await vaultService.setupTransit("transit", "user-data");

        Logger.info("✅ Transit engine setup complete!");
        Logger.info("");
        Logger.info("You can now use encryption methods:");
        Logger.info("  - vaultService.encrypt()");
        Logger.info("  - vaultService.decrypt()");
        Logger.info("  - vaultService.encryptFields()");
        Logger.info("  - vaultService.decryptFields()");

        process.exit(0);
    } catch (error) {
        Logger.error("❌ Failed to setup Transit engine", error);
        process.exit(1);
    }
}

setupTransit();
