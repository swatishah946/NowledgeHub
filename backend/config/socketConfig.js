// Ai-Amrit-School/backend/config/socketConfig.js

import { chatSocketHandler } from "../sockets/chatSocket.js";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const setupSockets = (io) => {
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error("Authentication error: No token provided."));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // --- THIS IS THE FIX ---
            // Fetch the user's name to use as the username
            const user = await User.findById(decoded.id).select("name");

            if (user) {
                socket.username = user.name; // Use the user's real name
                socket.userId = user._id;
                next();
            } else {
                return next(new Error("Authentication error: User not found."));
            }
        } catch (error) {
            console.error("Socket authentication error:", error.message);
            return next(new Error("Authentication error: Invalid token."));
        }
    });

    chatSocketHandler(io);
};