import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        console.log("🔗 Connecting to MongoDB...");

        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000,  // ✅ 10 second timeout
            socketTimeoutMS: 45000,           // ✅ 45 second socket timeout
            retryWrites: true,
            w: "majority"
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        return conn;

    } catch (error) {
        console.error("❌ MongoDB Connection Error:", error.message);
        process.exit(1);
    }
};