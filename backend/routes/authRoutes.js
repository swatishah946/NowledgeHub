import express from "express";
import { register, verifyUser, resendOtp, login, getMe } from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/register", authLimiter, register);
router.post("/verify", authLimiter, verifyUser);
router.post("/resend-otp", authLimiter, resendOtp);
router.post("/login", authLimiter, login);
router.get("/me", authenticate, getMe);

export default router;
