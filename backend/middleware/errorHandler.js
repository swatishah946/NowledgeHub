import multer from "multer";
import { HttpError } from "../utils/validation.js";
import { AIServiceError } from "../services/gemini.js";

const send = (res, status, message, code) =>
    res.status(status).json({
        success: false,
        // Frontend reads `error` for AI routes and `message` for auth routes.
        error: message,
        message,
        code,
        timestamp: new Date().toISOString(),
    });

export const notFound = (req, res) => send(res, 404, "Route not found", "NOT_FOUND");

export const errorHandler = (err, req, res, next) => {
    if (res.headersSent) return next(err);

    if (err instanceof HttpError || err instanceof AIServiceError) {
        if (err.status >= 500) console.error(`🔴 ${err.code || err.name}: ${err.message}`);
        return send(res, err.status, err.message, err.code);
    }

    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") return send(res, 413, "File size exceeds the 50MB limit", err.code);
        return send(res, 400, `Upload error: ${err.message}`, err.code);
    }

    // Malformed JSON body or body too large
    if (err.type === "entity.parse.failed") return send(res, 400, "Invalid JSON in request body", "BAD_JSON");
    if (err.type === "entity.too.large") return send(res, 413, "Request body too large", "BODY_TOO_LARGE");

    if (err.name === "CastError" || err.name === "ValidationError") {
        return send(res, 400, "Invalid request data", err.name);
    }
    if (err.name === "MongoNetworkError" || err.name === "MongoServerSelectionError") {
        console.error("🔴 Database error:", err.message);
        return send(res, 503, "Database connection error. Please try again.", "DB_UNAVAILABLE");
    }

    console.error("🔴 Unhandled error:", err);
    const status = Number(err.status || err.statusCode) || 500;
    send(res, status, status < 500 ? err.message : "Internal server error", "INTERNAL");
};

export default errorHandler;
