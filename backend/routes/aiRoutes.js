import express from "express";
import { getAIResponse, getQuiz, getRoadmap, getUserHistory, getSessionDetails, deleteSession } from "../controllers/aiController.js";
import { performDeepResearch } from "../controllers/researchController.js";

// Assuming you have an authentication middleware. If not, you can remove it.
import { authenticate } from "../middleware/authMiddleware.js"; 
// const authenticate = (req, res, next) => next(); // Placeholder if you don't have one

const router = express.Router();

router.post("/chat", authenticate, getAIResponse);
router.post("/quiz", authenticate, getQuiz);
router.post("/roadmap", authenticate, getRoadmap);
router.post("/research", authenticate, performDeepResearch);

// History Routes
router.get("/history", authenticate, getUserHistory);
router.get("/history/:sessionId", authenticate, getSessionDetails);
router.delete("/history/:sessionId", authenticate, deleteSession);

export default router;