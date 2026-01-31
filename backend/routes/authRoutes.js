import express from "express";
// --- START: New Feature ---
import { register, verifyUser, login, getMe } from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";
// --- END: New Feature ---

const router = express.Router();

router.post("/register", register);
router.post("/verify", verifyUser);
router.post("/login", login);

// --- START: New Feature ---
// This new route will provide the authenticated user's details
router.get("/me", authenticate, getMe);
// --- END: New Feature ---

export default router;