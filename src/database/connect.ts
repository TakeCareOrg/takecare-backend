import Logger from "@libs/logger";
import mongoose from "mongoose";

const connectToMongoDB = async (DATABASE_URL: string | undefined) => {
    if (!DATABASE_URL) {
        Logger.error("Database URL is not provided, insert it in .env file");
        throw new Error("Database URL is not provided");
    }

    const isDev: boolean = process.env.NODE_ENV === "development";

    Logger.info(
        `Connecting to MongoDB in ${isDev ? "development" : "production"} mode`,
    );

    try {
        const DB_OPTIONS = isDev ? { dbName: "dev" } : {};

        await mongoose.connect(DATABASE_URL, DB_OPTIONS);
        Logger.info("Connected to MongoDB");
    } catch (error) {
        Logger.error("Database connection failed", error);
        throw new Error("Database connection failed");
    }
};

export default connectToMongoDB;
