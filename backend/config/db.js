import mongoose from "mongoose";

export const connectDB = async () => {
    console.log("🔗 Connecting to MongoDB...");
    const conn = await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10_000, // give up finding a server after 10 s
        socketTimeoutMS: 45_000, // close sockets idle for 45 s mid-operation
        maxPoolSize: 20,
        retryWrites: true,
        w: "majority",
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
};
