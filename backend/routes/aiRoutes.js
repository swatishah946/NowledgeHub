import express from "express";
import { getAIResponse, getQuiz, getRoadmap, getUserHistory, getSessionDetails, deleteSession } from "../controllers/aiController.js";
import { performDeepResearch } from "../controllers/researchController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { aiLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.use(authenticate);

router.post("/chat", aiLimiter, getAIResponse);
router.post("/quiz", aiLimiter, getQuiz);
router.post("/roadmap", aiLimiter, getRoadmap);
router.post("/research", aiLimiter, performDeepResearch);

router.get("/history", getUserHistory);
router.get("/history/:sessionId", getSessionDetails);
router.delete("/history/:sessionId", deleteSession);

export default router;
