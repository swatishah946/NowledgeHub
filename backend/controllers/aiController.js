import { aiChatBot, generateQuiz, generateRoadmap } from "../services/aiService.js";

export const getAIResponse = async (req, res) => {
    const { query } = req.body;
    
    if (!query || !query.trim()) {
        return res.status(400).json({ 
            response: "❌ Please provide a valid query", 
            error: "Query is required" 
        });
    }

    try {
        console.log(`🤖 Processing AI request: ${query}`);
        const response = await aiChatBot(query.trim());
        console.log(`🤖 AI Response: ${response}`);
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
        res.json({ roadmap, status: "success" });
    } catch (err) {
        console.error("❌ Roadmap Generation Error:", err);
        res.status(500).json({ 
            error: err.message || "Failed to generate roadmap",
            roadmap: null
        });
    }
};