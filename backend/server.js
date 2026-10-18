import "dotenv/config"; // load .env before any other module reads process.env
import http from "http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { getAllowedOrigins } from "./config/cors.js";
import { setupSockets } from "./config/socketConfig.js";
import { AI_CONFIG } from "./config/ai.js";
import { getEmailProvider, getSender } from "./services/emailService.js";

const PORT = process.env.PORT || 5000;

const checkEnv = () => {
    const missing = ["MONGO_URI", "JWT_SECRET"].filter((key) => !process.env[key]);
    if (missing.length) {
        console.error(`❌ Missing required environment variables: ${missing.join(", ")}`);
        process.exit(1);
    }
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) console.warn("⚠️ GEMINI_API_KEY not set: AI features will return 503.");
    if (!process.env.TAVILY_API_KEY) console.warn("⚠️ TAVILY_API_KEY not set: Deep Research will return 503.");
    const emailProvider = getEmailProvider();
    if (emailProvider) console.log(`📧 Email provider: ${emailProvider === "brevo" ? "Brevo API" : "SMTP (Nodemailer)"}, sender ${getSender().email}`);
    else console.warn("⚠️ No email provider (BREVO_API_KEY or EMAIL_USER/EMAIL_PASS) set: OTP codes will be printed to the console (dev only).");
    console.log(`🤖 Models: chat=${AI_CONFIG.chatModel}, fast=${AI_CONFIG.fastModel}, embeddings=${AI_CONFIG.embeddingModel} (${AI_CONFIG.embeddingDimensions} dims)`);
};

const start = async () => {
    checkEnv();
    try {
        await connectDB();
    } catch (error) {
        console.error("❌ MongoDB Connection Error:", error.message);
        process.exit(1);
    }

    const server = http.createServer(app);
    const io = new Server(server, {
        cors: { origin: getAllowedOrigins(), credentials: true },
        maxHttpBufferSize: 100_000, // 100 KB per socket message (chat text only)
    });
    setupSockets(io);

    server.listen(PORT, () => {
        console.log(`✅ Server running at http://localhost:${PORT}`);
    });

    const shutdown = (signal) => {
        console.log(`${signal} received, shutting down...`);
        io.close();
        server.close(async () => {
            await mongoose.connection.close();
            process.exit(0);
        });
        setTimeout(() => process.exit(1), 10_000).unref();
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
};

process.on("unhandledRejection", (reason) => console.error("🔴 Unhandled rejection:", reason));

start();
