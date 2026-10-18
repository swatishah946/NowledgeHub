import express from "express";
import multer from "multer";
import {
    uploadPDF,
    chatWithPDF,
    listDocuments,
    deleteDocument,
    clearVectorStore,
    verifyVectorIndex,
    getRAGMetrics,
    healthCheck,
} from "../controllers/studyController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { aiLimiter, uploadLimiter } from "../middleware/rateLimiter.js";
import { HttpError } from "../utils/validation.js";

const router = express.Router();

// PDFs are kept in memory (no disk on Render), max 50 MB, one file per request.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== "application/pdf") return cb(new HttpError(400, "Only PDF files are allowed"));
        cb(null, true);
    },
});

router.get("/health", healthCheck);

router.use(authenticate);

router.post("/upload", uploadLimiter, upload.single("pdf"), uploadPDF);
router.post("/ask", aiLimiter, chatWithPDF);

router.get("/documents", listDocuments);
router.delete("/documents/:source", deleteDocument);
router.post("/clear", clearVectorStore); // deletes only the caller's documents

router.get("/verify-index", verifyVectorIndex);
router.get("/metrics", getRAGMetrics);

export default router;
