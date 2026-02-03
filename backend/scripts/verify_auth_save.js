import mongoose from "mongoose";
import ChatHistory from "../models/ChatHistory.js";
import dotenv from "dotenv";
import axios from "axios";
import jwt from "jsonwebtoken";

dotenv.config();

const verifyAuthSave = async () => {
    // 1. Create a Fake User & Token
    const testUserId = new mongoose.Types.ObjectId();
    const token = jwt.sign({ id: testUserId, email: "test@example.com" }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    console.log("🔑 Generated Test Token for UserID:", testUserId);

    // 2. Send Authenticated Request
    console.log("🚀 Sending AUTHENTICATED Request...");
    const sessionId = "auth-test-" + Date.now();
    try {
        const response = await axios.post("http://localhost:5000/api/ai/chat", {
            query: "Hello, do you know who I am?",
            sessionId: sessionId,
            type: "chat"
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("✅ API Response:", response.data.status);
    } catch (err) {
        console.error("❌ API Request Failed:", err.message);
        if (err.response) console.error("   Response:", err.response.data);
    }

    // 3. Check Database
    console.log("🔍 Checking Database...");
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const doc = await ChatHistory.findOne({ sessionId });
        if (doc) {
            console.log("✅ FOUND Document!");
            console.log("   - SessionId:", doc.sessionId);
            console.log("   - Saved UserId:", doc.userId);
            
            if (doc.userId.toString() === testUserId.toString()) {
                console.log("🎉 SUCCESS! User ID matches the token!");
            } else {
                console.error("❌ FAILURE! User ID mismatch.");
                console.log("   Expected:", testUserId.toString());
                console.log("   Actual:", doc.userId.toString());
            }
        } else {
            console.error("❌ DOCUMENT NOT FOUND in DB.");
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error("❌ DB Check Failed:", err);
    }
};

verifyAuthSave();
