import express from "express";
import multer from "multer";
import {
    uploadPDF,
    chatWithPDF,
    clearVectorStore,
    verifyVectorIndex,
    getRAGMetrics,
    healthCheck
} from "../controllers/studyController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// Configure Multer (Memory Storage with validation)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB max
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files allowed'));
        }
        cb(null, true);
    }
});

// ✅ PDF Upload & RAG Query (Protected)
router.post("/upload", authenticate, upload.single("pdf"), uploadPDF);
router.post("/ask", authenticate, chatWithPDF);

// ✅ Utility Routes
router.post("/clear", clearVectorStore); // Optional: Add authenticate middleware if needed
router.get("/verify-index", verifyVectorIndex);
router.get("/metrics", getRAGMetrics);
router.get("/health", healthCheck);

export default router;
