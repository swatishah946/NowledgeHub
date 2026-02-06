import { aiChatBot, generateQuiz, generateRoadmap } from "../services/aiService.js";
import ChatHistory from "../models/ChatHistory.js";
import mongoose from "mongoose";

// --- HELPERS ---
const saveToHistory = async (userId, sessionId, type, query, response, metadata = null) => {
    try {
        if (sessionId) {
            let uid = userId || null;
            // If we don't have a userId (guest), we generate a temp one if needed, 
            // but ideally we only save if we have a userId or a persistent sessionId mechanism.
            // For now, if no userId, we might skip or create a temp one if logic allows.
            
            if (!uid) {
                // If unauthenticated but has sessionId, we might try to find existing session to attach to?
                // Or just standard flow:
                return; 
            }

            await ChatHistory.updateOne(
                { sessionId },
                { 
                    $setOnInsert: { userId: uid, title: `${type === 'chat' ? 'Chat' : type}: ${query.substring(0, 30)}...`, type },
                    $push: { messages: [
                        { role: 'user', content: query },
                        { role: 'model', content: typeof response === 'string' ? response : JSON.stringify(response), metadata }
                    ]}
                },
                { upsert: true }
            );
        }
    } catch (error) {
        console.error("❌ History Save Error:", error);
    }
};

/* -------------------------------------------------------------------------- */
/*                               AI GENERATION                                */
/* -------------------------------------------------------------------------- */

export const getAIResponse = async (req, res) => {
    const { query, sessionId } = req.body;
    const userId = req.user ? req.user.id : null;

    if (!query || !query.trim()) {
        return res.status(400).json({ error: "Query is required" });
    }

    try {
        const response = await aiChatBot(query.trim());
        
        // Save to History
        if (userId && sessionId) {
            await saveToHistory(userId, sessionId, 'chat', query, response);
        }

        res.json({ response, status: "success" });
    } catch (err) {
        console.error("❌ AI Controller Error:", err);
        res.status(500).json({ error: err.message });
    }
};


export const getQuiz = async (req, res) => {
    const { topic, sessionId } = req.body;
    const userId = req.user ? req.user.id : null;

    if (!topic || !topic.trim()) {
        return res.status(400).json({ error: "Topic is required" });
    }

    try {
        const quiz = await generateQuiz(topic.trim());
        
        // Save to History
        if (userId && sessionId) {
           await saveToHistory(userId, sessionId, 'quiz', `Generate Quiz: ${topic}`, "Quiz Generated", quiz);
        }

        res.json({ quiz, status: "success" });
    } catch (err) {
        console.error("❌ Quiz Generation Error:", err);
        res.status(500).json({ error: err.message });
    }
};

export const getRoadmap = async (req, res) => {
    const { goal, sessionId } = req.body;
    const userId = req.user ? req.user.id : null;

    if (!goal || !goal.trim()) {
        return res.status(400).json({ error: "Goal is required" });
    }

    try {
        const roadmap = await generateRoadmap(goal.trim());
        
        // Save to History
        if (userId && sessionId) {
            await saveToHistory(userId, sessionId, 'roadmap', `Generate Roadmap: ${goal}`, "Roadmap Generated", roadmap);
        }

        res.json({ roadmap, status: "success" });
    } catch (err) {
        console.error("❌ Roadmap Generation Error:", err);
        res.status(500).json({ error: err.message });
    }
};

/* -------------------------------------------------------------------------- */
/*                               HISTORY MANAGEMENT                           */
/* -------------------------------------------------------------------------- */

export const getUserHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const history = await ChatHistory.find({ userId, isDeleted: false })
            .sort({ updatedAt: -1 })
            .select("sessionId title type updatedAt");
        
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getSessionDetails = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;

        const session = await ChatHistory.findOne({ sessionId, userId, isDeleted: false });

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        res.json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;

        await ChatHistory.findOneAndUpdate(
            { sessionId, userId },
            { isDeleted: true }
        );

        res.json({ message: "Session deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};