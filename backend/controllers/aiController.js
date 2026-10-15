import { aiChatBot, generateQuiz, generateRoadmap } from "../services/aiService.js";
import { saveExchange, loadConversation } from "../services/historyService.js";
import ChatHistory from "../models/ChatHistory.js";
import { AI_CONFIG } from "../config/ai.js";
import { requireString, optionalSessionId, HttpError } from "../utils/validation.js";

/* -------------------------------------------------------------------------- */
/*                               AI GENERATION                                */
/* -------------------------------------------------------------------------- */

export const getAIResponse = async (req, res) => {
    const query = requireString(req.body?.query, "Query", { max: 5000 });
    const sessionId = optionalSessionId(req.body?.sessionId);
    const userId = req.user.id;

    // Conversation memory: send the last few messages of this session to the model.
    const history = sessionId
        ? await loadConversation({ userId, sessionId, limit: AI_CONFIG.chatHistoryMessages })
        : [];

    const response = await aiChatBot(query, history);
    await saveExchange({ userId, sessionId, type: "chat", query, response });

    res.json({ response, status: "success" });
};

export const getQuiz = async (req, res) => {
    const topic = requireString(req.body?.topic, "Topic", { max: 200 });
    const sessionId = optionalSessionId(req.body?.sessionId);

    const quiz = await generateQuiz(topic);
    await saveExchange({ userId: req.user.id, sessionId, type: "quiz", query: `Generate Quiz: ${topic}`, response: "Quiz generated", metadata: quiz });

    res.json({ quiz, status: "success" });
};

export const getRoadmap = async (req, res) => {
    const goal = requireString(req.body?.goal, "Goal", { max: 200 });
    const sessionId = optionalSessionId(req.body?.sessionId);

    const roadmap = await generateRoadmap(goal);
    await saveExchange({ userId: req.user.id, sessionId, type: "roadmap", query: `Generate Roadmap: ${goal}`, response: "Roadmap generated", metadata: roadmap });

    res.json({ roadmap, status: "success" });
};

/* -------------------------------------------------------------------------- */
/*                               HISTORY MANAGEMENT                           */
/* -------------------------------------------------------------------------- */

const MODE_TO_TYPE = { chat: "chat", research: "research", pdf: "pdf-chat", "pdf-chat": "pdf-chat", quiz: "quiz", roadmap: "roadmap" };

export const getUserHistory = async (req, res) => {
    const filter = { userId: req.user.id, isDeleted: false };
    const mode = typeof req.query.mode === "string" ? req.query.mode : undefined;
    if (mode && MODE_TO_TYPE[mode]) filter.type = MODE_TO_TYPE[mode];

    const history = await ChatHistory.find(filter)
        .sort({ updatedAt: -1 })
        .limit(50)
        .select("sessionId title type updatedAt")
        .lean();

    res.json(history);
};

export const getSessionDetails = async (req, res) => {
    const sessionId = optionalSessionId(req.params.sessionId);
    if (!sessionId) throw new HttpError(400, "Invalid sessionId");

    const session = await ChatHistory.findOne({ sessionId, userId: req.user.id, isDeleted: false }).lean();
    if (!session) throw new HttpError(404, "Session not found");

    res.json(session);
};

export const deleteSession = async (req, res) => {
    const sessionId = optionalSessionId(req.params.sessionId);
    if (!sessionId) throw new HttpError(400, "Invalid sessionId");

    const result = await ChatHistory.updateOne({ sessionId, userId: req.user.id }, { isDeleted: true });
    if (result.matchedCount === 0) throw new HttpError(404, "Session not found");

    res.json({ message: "Session deleted successfully" });
};
