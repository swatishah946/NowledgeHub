import mongoose from "mongoose";
import ChatHistory from "../models/ChatHistory.js";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const verifySave = async () => {
    // 1. Send Request to API
    console.log("🚀 Sending Test Request...");
    const sessionId = "test-session-" + Date.now();
    try {
        const response = await axios.post("http://localhost:5000/api/ai/chat", {
            query: "Hello, are you saving this?",
            sessionId: sessionId,
            type: "chat" // Explicitly sending type
        });
        console.log("✅ API Response:", response.data.status);
    } catch (err) {
        console.error("❌ API Request Failed:", err.message);
        // Continue to check DB anyway just in case
    }

    // 2. Check Database directly
    console.log("🔍 Checking Database...");
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const doc = await ChatHistory.findOne({ sessionId });
        if (doc) {
            console.log("✅ FOUND Document in DB!");
            console.log("   - SessionId:", doc.sessionId);
            console.log("   - UserId:", doc.userId);
            console.log("   - Messages:", doc.messages.length);
        } else {
            console.error("❌ DOCUMENT NOT FOUND in DB.");
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error("❌ DB Check Failed:", err);
    }
};

verifySave();
