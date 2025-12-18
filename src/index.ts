import dotenv from "dotenv";

// Load environment variables FIRST before any other imports
dotenv.config();

import { Server } from "http";
import { app } from "./app";
import Logger from "@libs/logger";
import connectToMongoDB from "@database/connect";
import vaultService from "@services/vault";
import type { MongoDbSecrets } from "@dtypes/vault";

const port: string | number = process.env.PORT || 3000;

let server: Server;

const startServer = async () => {
    try {
        Logger.info("🚀 Starting TakeCare Backend...");

        await vaultService.init();
        const mongoUrl = await vaultService.getSecret<MongoDbSecrets>(
            "takecare/data/mongo_db",
        );

        await connectToMongoDB(mongoUrl.DEV_TAKECARE_DATABASE_URL);

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
