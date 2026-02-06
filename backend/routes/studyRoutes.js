import express from "express";
import multer from "multer";
import { uploadPDF, chatWithPDF, clearVectorStore } from "../controllers/studyController.js";
import { authenticate } from "../middleware/authMiddleware.js"; // Optional: Protect routes

const router = express.Router();

// Configure Multer (Memory Storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Routes
router.post("/upload", authenticate, upload.single("pdf"), uploadPDF);
router.post("/ask", authenticate, chatWithPDF);
router.post("/clear", clearVectorStore);

export default router;
