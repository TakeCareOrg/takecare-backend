import dotenv from "dotenv";

// Load environment variables FIRST before any other imports
dotenv.config();

import { setSecrets } from "@config/secrets";
import connectToMongoDB from "@database/connect";
import type {
    ChatSecrets,
    JwtSecrets,
    MailSecrets,
    MongoDbSecrets,
    WithingsSecrets,
} from "@dtypes/vault";
import Logger from "@libs/logger";
import { initMailTransport } from "@services/mail";
import vaultService from "@services/vault";
import { WITHINGS_TOKEN_KEY } from "@services/withings";
import { startWithingsJobs } from "@jobs/withings-token-refresh";
import { Server } from "http";
import { app } from "./app";

const port: string | number = process.env.PORT || 3000;

let server: Server;

const startServer = async () => {
    try {
        Logger.info("🚀 Starting TakeCare Backend...");

        await vaultService.init();

        const [mongoSecrets, jwtSecrets, mailSecrets, chatSecrets] =
            await Promise.all([
                vaultService.getSecret<MongoDbSecrets>(
                    "takecare/data/mongo_db",
                ),
                vaultService.getSecret<JwtSecrets>("takecare/data/jwt"),
                vaultService.getSecret<MailSecrets>("takecare/data/mail"),
                vaultService.getSecret<ChatSecrets>("takecare/data/chat"),
            ]);

        // Withings is loaded best-effort: the integration is optional and
        // we don't want a missing Vault secret to take the whole backend
        // down. If it fails, the `/withings/*` endpoints surface a 503 to
        // the mobile client and the rest of the app keeps working.
        let withingsSecrets: WithingsSecrets | undefined;
        try {
            withingsSecrets = await vaultService.getSecret<WithingsSecrets>(
                "takecare/data/withings",
            );
        } catch (error) {
            Logger.warn(
                "Withings secrets not loaded — integration disabled",
                error,
            );
        }

        setSecrets({
            mongo: mongoSecrets,
            jwt: jwtSecrets,
            mail: mailSecrets,
            chat: chatSecrets,
            withings: withingsSecrets,
        });

        if (withingsSecrets) {
            // Ensure the Withings token encryption key exists on Vault
            // transit. `createEncryptionKey` is idempotent — no-ops on
            // re-runs.
            try {
                await vaultService.createEncryptionKey(
                    WITHINGS_TOKEN_KEY,
                    "transit",
                    {
                        type: "aes256-gcm96",
                        derived: true,
                    },
                );
            } catch (error) {
                Logger.error(
                    "Failed to provision Withings transit key — refreshes will fail",
                    error,
                );
            }
        }

        // Initialize mail transport (now that we have secrets)
        initMailTransport();

        // Connect to MongoDB
        await connectToMongoDB(mongoSecrets.TAKECARE_DATABASE_URL);

        // Kick off the Withings refresh + deferred-webhook sweepers
        // **after** DB connection so the first tick has Mongo available.
        if (withingsSecrets) {
            startWithingsJobs();
        }

        server = app.listen(port, () => {
            Logger.info(`✅ Server running on port ${port}`);
        });
    } catch (error) {
        Logger.error("❌ Failed to start server", error);
        process.exit(1);
    }
};

startServer();

export { server };
