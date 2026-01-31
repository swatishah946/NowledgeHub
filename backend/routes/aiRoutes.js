import express from "express";
import { getAIResponse, getQuiz, getRoadmap } from "../controllers/aiController.js";

// Assuming you have an authentication middleware. If not, you can remove it.
// import { authenticate } from "../middleware/authMiddleware.js"; 
const authenticate = (req, res, next) => next(); // Placeholder if you don't have one

const router = express.Router();

router.post("/chat", authenticate, getAIResponse);
router.post("/quiz", authenticate, getQuiz);
router.post("/roadmap", authenticate, getRoadmap);

export default router;