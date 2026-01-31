import express from "express";
import cors from "cors";
import dotenv from 'dotenv';
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

import chatRoutes from "./routes/chatRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";




dotenv.config();
connectDB();

// ✅ Declare app FIRST
const app = express();

// ✅ Then use middlewares and routes
app.use(cors());
app.use(express.json());

// ✅ Routes after app initialization
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);

app.use("/api/chat", chatRoutes);

// ✅ Health Check Route
app.get("/", (req, res) => res.send("✅ API is running"));


// In Express backend (server.js or app.js)
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});



// ✅ Error Handler Last
app.use(errorHandler);

export default app;
