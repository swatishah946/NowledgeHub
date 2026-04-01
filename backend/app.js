import express from "express";
import cors from "cors";
import dotenv from 'dotenv';
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import studyRoutes from "./routes/studyRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/study", studyRoutes);

// ✅ Health Check
app.get("/health", (req, res) => {
    res.json({
        status: "✅ Server running",
        timestamp: new Date().toISOString()
    });
});

app.get("/", (req, res) => {
    res.send("✅ NowledgeHub API is running");
});

// Error Handler (MUST be last)
app.use(errorHandler);

export default app;
