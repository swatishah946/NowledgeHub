import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { createRoom, joinRoom, getRoomMessages, postMessage } from "../controllers/chatController.js";
import { getRecentMessages } from "../controllers/chatController.js";

const router = express.Router();

router.post("/create", authenticate, createRoom);
router.post("/join", authenticate, joinRoom);
router.get("/messages/:roomId", authenticate, getRoomMessages);
router.post("/message", authenticate, postMessage);
router.get("/recent/:roomId", authenticate, getRecentMessages);

export default router;
