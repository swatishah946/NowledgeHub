import { aiChatBot, generateQuiz, generateRoadmap } from "../services/aiService.js";
import ChatHistory from "../models/ChatHistory.js";
import mongoose from "mongoose";

export const getAIResponse = async (req, res) => {
    const { query, sessionId, userId, type } = req.body; // Expect sessionId and type from frontend
    
    if (!query || !query.trim()) {
        return res.status(400).json({ error: "Query is required" });
    }

    try {
        // 1. Fetch History
        // Use provided userId or fallback to authenticated user if available
        let uid = userId || (req.user ? req.user.id : null); 
        const sid = sessionId || "default-session";

         // Ensure uid is a valid ObjectId if available, otherwise generate one for guest
         if (!uid) {
            uid = new mongoose.Types.ObjectId();
         }

        let chatHistory = await ChatHistory.findOne({ sessionId: sid });

        // Format history for Gemini
        const historyForGemini = chatHistory ? chatHistory.messages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        })) : [];

        // 2. Call AI Service
        console.log(`🤖 Processing AI request for Session ${sid}`);
        const response = await aiChatBot(query.trim(), historyForGemini);
        console.log(`🤖 AI Response generated.`);

        // 3. Save to DB
        if (!chatHistory) {
            console.log(`📝 Creating NEW ChatHistory for Session: ${sid}, User: ${uid}`);
            chatHistory = new ChatHistory({
                userId: uid,
                sessionId: sid,
                type: type || 'chat',
                title: query.substring(0, 30) + "...",
                messages: []
            });
        } else {
            console.log(`📝 Updating EXISTING ChatHistory for Session: ${sid}`);
            // Fix for existing sessions: proper "adoption" logic
            // If the user is authenticated (req.user exists), verify/update session ownership
            if (req.user && chatHistory.userId.toString() !== req.user.id) {
                console.log(`⚠️ Session ${sid} ownership transfer: ${chatHistory.userId} -> ${req.user.id}`);
                chatHistory.userId = req.user.id;
            }
            // Fallback for NULL userIds (dirty data)
            else if (!chatHistory.userId) {
                console.log(`⚠️ Patching missing userId for session ${sid}`);
                chatHistory.userId = uid;
            }
        }

        chatHistory.messages.push({ role: 'user', content: query });
        chatHistory.messages.push({ role: 'model', content: response });
        
        try {
            await chatHistory.save();
            console.log(`✅ successfully saved to DB for session: ${sid}`);
        } catch (saveError) {
            console.error("❌ DB SAVE ERROR:", saveError);
        }

        res.json({ response, status: "success" });
    } catch (err) {
        console.error("❌ AI Controller Error:", err);
        res.status(500).json({ 
            response: "❌ AI request failed", 
            error: err.message,
            status: "error"
        });
    }
};

// -- History Management Endpoints --

export const getUserHistory = async (req, res) => {
    try {
        console.log("📜 fetching User History...");
        console.log("   - User from req.user:", req.user);
        console.log("   - Query Params:", req.query);
        
        const uid = req.user ? req.user.id : req.query.userId;
        const { mode } = req.query;

        console.log("   - Resolved UID:", uid);

        let query = { userId: uid };
        if (mode) {
            query.type = mode;
        }

        console.log("   - Mongo Query:", JSON.stringify(query));

        const history = await ChatHistory.find(query)
                                         .select("sessionId title type updatedAt")
                                         .sort({ updatedAt: -1 });
        
        console.log(`   - Found ${history.length} records.`);
        res.json(history);
    } catch (error) {
        console.error("❌ getUserHistory Error:", error);
        res.status(500).json({ error: "Failed to fetch history" });
    }
};

export const getSessionDetails = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await ChatHistory.findOne({ sessionId });
        if (!session) return res.status(404).json({ error: "Session not found" });
        res.json(session);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch session details" });
    }
};

export const deleteSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        await ChatHistory.deleteOne({ sessionId });
        res.json({ message: "Session deleted" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete session" });
    }
};


export const getQuiz = async (req, res) => {
    const { topic } = req.body;
    
    if (!topic || !topic.trim()) {
        return res.status(400).json({ 
            error: "Topic is required",
            quiz: null
        });
    }

    try {
        const quiz = await generateQuiz(topic.trim());

        // Save Quiz to History (Optional, per user request to have 'quiz chat history')
        const { sessionId, userId } = req.body;
        if (sessionId) {
            let uid = userId || (req.user ? req.user.id : null); 
            if (!uid) {
                uid = new mongoose.Types.ObjectId();
            } 
             // Find or create session (usually separate session or same?)
             // Assuming we append to the same session log or create new
             // For simplicity, let's treat it as a logging event
             await ChatHistory.updateOne(
                 { sessionId },
                 { 
                     $set: { userId: uid, type: 'quiz' },
                     $setOnInsert: { title: `Quiz: ${topic}` },
                     $push: { messages: [
                        { role: 'user', content: `Generate Quiz: ${topic}` },
                        { role: 'model', content: JSON.stringify(quiz), metadata: { type: 'quiz_data' } }
                     ]}
                 },
                 { upsert: true }
             );
        }

        res.json({ quiz, status: "success" });
    } catch (err) {
        console.error("❌ Quiz Generation Error:", err);
        res.status(500).json({ 
            error: err.message || "Failed to generate quiz",
            quiz: null
        });
    }
};

export const getRoadmap = async (req, res) => {
    const { goal } = req.body;
    
    if (!goal || !goal.trim()) {
        return res.status(400).json({ 
            error: "Goal is required",
            roadmap: null
        });
    }

    try {
        const roadmap = await generateRoadmap(goal.trim());

        const { sessionId, userId } = req.body;
        if (sessionId) {
            let uid = userId || (req.user ? req.user.id : null);
            if (!uid) {
                uid = new mongoose.Types.ObjectId();
            }
             await ChatHistory.updateOne(
                 { sessionId },
                 { 
                     $set: { userId: uid, type: 'roadmap' },
                     $setOnInsert: { title: `Roadmap: ${goal}` },
                     $push: { messages: [
                        { role: 'user', content: `Generate Roadmap: ${goal}` },
                        { role: 'model', content: JSON.stringify(roadmap), metadata: { type: 'roadmap_data' } }
                     ]}
                 },
                 { upsert: true }
             );
        }

        res.json({ roadmap, status: "success" });
    } catch (err) {
        console.error("❌ Roadmap Generation Error:", err);
        res.status(500).json({ 
            error: err.message || "Failed to generate roadmap",
            roadmap: null
        });
    }
};