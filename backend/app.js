import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/authRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import studyRoutes from "./routes/studyRoutes.js";
import { corsOptions } from "./config/cors.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

const app = express();

// Render/Vercel put one proxy in front of the app; trust it so req.ip is the
// real client IP (needed for per-IP rate limiting).
app.set("trust proxy", Number(process.env.TRUST_PROXY ?? 1));

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));

app.get("/health", (req, res) => {
    res.json({ status: "✅ Server running", timestamp: new Date().toISOString() });
});
app.get("/", (req, res) => {
    res.send("✅ NowledgeHub API is running");
});

app.use("/api", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/study", studyRoutes);

app.use(notFound);
app.use(errorHandler); // must be last

export default app;
