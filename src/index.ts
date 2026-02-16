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
} from "@dtypes/vault";
import Logger from "@libs/logger";
import { initMailTransport } from "@services/mail";
import vaultService from "@services/vault";
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

        setSecrets({
            mongo: mongoSecrets,
            jwt: jwtSecrets,
            mail: mailSecrets,
            chat: chatSecrets,
        });

        // Initialize mail transport (now that we have secrets)
        initMailTransport();

        // Connect to MongoDB
        await connectToMongoDB(mongoSecrets.TAKECARE_DATABASE_URL);

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
