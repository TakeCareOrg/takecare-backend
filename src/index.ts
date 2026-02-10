import dotenv from "dotenv";

// Load environment variables FIRST before any other imports
dotenv.config();

import { Server } from "http";
import { app } from "./app";
import Logger from "@libs/logger";
import connectToMongoDB from "@database/connect";
import vaultService from "@services/vault";
import { setSecrets } from "@config/secrets";
import { initMailTransport } from "@services/mail";
import type {
    MongoDbSecrets,
    JwtSecrets,
    MailSecrets,
    ChatSecrets,
} from "@dtypes/vault";

const port: string | number = process.env.PORT || 3000;

let server: Server;

const startServer = async () => {
    try {
        Logger.info("🚀 Starting TakeCare Backend...");

        // Initialize Vault
        await vaultService.init();

        // Fetch all secrets from Vault
        const [mongoSecrets, jwtSecrets, mailSecrets, chatSecrets] =
            await Promise.all([
                vaultService.getSecret<MongoDbSecrets>(
                    "takecare/data/mongo_db",
                ),
                vaultService.getSecret<JwtSecrets>("takecare/data/jwt"),
                vaultService.getSecret<MailSecrets>("takecare/data/mail"),
                vaultService.getSecret<ChatSecrets>("takecare/data/chat"),
            ]);

        // Store secrets in memory for the app to use
        setSecrets({
            jwt: jwtSecrets,
            mail: mailSecrets,
            chat: chatSecrets,
        });

        // Initialize mail transport (now that we have secrets)
        initMailTransport();

        // Connect to MongoDB
        await connectToMongoDB(mongoSecrets.DEV_TAKECARE_DATABASE_URL);

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
