import mongoose from "mongoose";
import dotenv from "dotenv";
import ChatHistory from "../models/ChatHistory.js";

dotenv.config();

const clearDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        const result = await ChatHistory.deleteMany({});
        console.log(`🗑️ Cleared ${result.deletedCount} chat history records.`);

        await mongoose.disconnect();
        console.log("✅ Disconnected");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error clearing DB:", error);
        process.exit(1);
    }
};

clearDB();
