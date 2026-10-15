import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

const handler = (req, res, next, options) => {
    const retryAfterSeconds = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
    res.status(options.statusCode).json({
        message: options.message,
        error: options.message,
        retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? Math.max(retryAfterSeconds, 1) : undefined,
    });
};

const base = { standardHeaders: "draft-8", legacyHeaders: false, handler };

// Logged-in routes are limited per user (many students can share one college IP);
// anonymous routes fall back to the IP address.
const userOrIp = (req) => (req.user?.id ? `user:${req.user.id}` : ipKeyGenerator(req.ip));

// Every /api request: 300 per 15 minutes per IP.
export const apiLimiter = rateLimit({
    ...base,
    windowMs: FIFTEEN_MINUTES,
    limit: 300,
    message: "Too many requests, please try again in a few minutes.",
});

// Login / register / verify / resend: 20 per 15 minutes per IP (brute-force protection).
export const authLimiter = rateLimit({
    ...base,
    windowMs: FIFTEEN_MINUTES,
    limit: 20,
    message: "Too many attempts. Please wait 15 minutes and try again.",
});

// AI calls cost money (Gemini + Tavily): 40 per 15 minutes per user.
export const aiLimiter = rateLimit({
    ...base,
    windowMs: FIFTEEN_MINUTES,
    limit: 40,
    keyGenerator: userOrIp,
    message: "You've reached the AI request limit. Please wait a few minutes.",
});

// PDF uploads are the most expensive (hundreds of embeddings): 10 per hour per user.
export const uploadLimiter = rateLimit({
    ...base,
    windowMs: ONE_HOUR,
    limit: 10,
    keyGenerator: userOrIp,
    message: "Upload limit reached (10 per hour). Please try again later.",
});
