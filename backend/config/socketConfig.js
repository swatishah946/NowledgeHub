import { chatSocketHandler } from "../sockets/chatSocket.js";
import { verifyToken } from "../utils/jwtUtils.js";
import User from "../models/User.js";

// Runs once per connection: the JWT from the handshake is verified and the
// user is loaded before any event handler can run.
export const socketAuth = async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        if (!token || typeof token !== "string") {
            return next(new Error("Authentication error: No token provided."));
        }
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.id).select("name").lean();
        if (!user) return next(new Error("Authentication error: User not found."));

        socket.username = user.name;
        socket.userId = String(user._id);
        next();
    } catch (error) {
        return next(new Error("Authentication error: Invalid token."));
    }
};

export const setupSockets = (io) => {
    io.use(socketAuth);
    chatSocketHandler(io);
};
