import Logger from "@libs/logger";
import mongoose from "mongoose";

const connectToMongoDB = async () => {
    if (!process.env.TAKECARE_DATABASE_URL) {
        Logger.error("Database URL is not provided, insert it in .env file");
        throw new Error("Database URL is not provided");
    }

    try {
        const DB_OPTIONS = { dbName: "dev" };
        const DATABASE_URL = process.env.TAKECARE_DATABASE_URL;

        await mongoose.connect(DATABASE_URL, DB_OPTIONS);
        Logger.info("Connected to MongoDB");
    } catch (error) {
        Logger.error("Database connection failed", error);
        throw new Error("Database connection failed");
    }
};

export default connectToMongoDB;
