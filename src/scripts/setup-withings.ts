// Script to push Withings dev-portal credentials to Vault and provision
// the `withings-tokens` transit key. Run once per environment:
//
//   WITHINGS_CLIENT_ID=... \
//   WITHINGS_CLIENT_SECRET=... \
//   WITHINGS_REDIRECT_URI=https://api-tc.loule.me/withings/oauth/callback \
//   WITHINGS_WEBHOOK_URL=https://api-tc.loule.me/withings/webhook \
//   npx ts-node -r tsconfig-paths/register src/scripts/setup-withings.ts
//
// Idempotent: re-running with the same values is a no-op. Re-running with
// different values rotates the secret (existing user tokens are unaffected
// because they live in MongoDB encrypted with the unchanged `withings-tokens`
// transit key — only future OAuth flows pick up the new client credentials).
import dotenv from "dotenv";

dotenv.config();

import vaultService from "@services/vault";
import Logger from "@libs/logger";

async function run() {
    const required = [
        "WITHINGS_CLIENT_ID",
        "WITHINGS_CLIENT_SECRET",
        "WITHINGS_REDIRECT_URI",
        "WITHINGS_WEBHOOK_URL",
    ] as const;

    const missing = required.filter((k) => !process.env[k]);
    if (missing.length > 0) {
        Logger.error(
            `Missing env vars before running setup-withings: ${missing.join(", ")}`,
        );
        Logger.error(
            "Set them either inline on the command line or in .env, then re-run.",
        );
        process.exit(1);
    }

    const payload = {
        WITHINGS_CLIENT_ID: process.env.WITHINGS_CLIENT_ID,
        WITHINGS_CLIENT_SECRET: process.env.WITHINGS_CLIENT_SECRET,
        WITHINGS_REDIRECT_URI: process.env.WITHINGS_REDIRECT_URI,
        WITHINGS_WEBHOOK_URL: process.env.WITHINGS_WEBHOOK_URL,
    };

    Logger.info("🔧 Setting up Withings Vault secret + transit key…");
    Logger.info(`   redirect_uri: ${payload.WITHINGS_REDIRECT_URI}`);
    Logger.info(`   webhook_url:  ${payload.WITHINGS_WEBHOOK_URL}`);

    await vaultService.init();
    await vaultService.setSecret("takecare/data/withings", payload);
    Logger.info("✅ Withings secret pushed to takecare/data/withings");

    // Same key the backend would auto-create at startup, but doing it here
    // means the very first server boot doesn't have to wait on the
    // transit/key/create round-trip.
    await vaultService.createEncryptionKey("withings-tokens", "transit", {
        type: "aes256-gcm96",
        derived: true,
    });
    Logger.info("✅ Transit key `withings-tokens` ensured");
    Logger.info(
        "Done. Restart the backend so it picks up the secrets on its next Vault load.",
    );
    process.exit(0);
}

run().catch((error) => {
    Logger.error("❌ Failed to setup Withings", error);
    process.exit(1);
});
