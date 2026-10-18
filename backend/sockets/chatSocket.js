import { canAccessRoom, saveMessage, toMessageDTO, MAX_MESSAGE_LENGTH } from "../services/roomService.js";

// Simple per-connection flood protection: max 10 messages per 10 seconds.
const MESSAGE_LIMIT = 10;
const MESSAGE_WINDOW_MS = 10_000;

const reply = (ack, payload) => {
    if (typeof ack === "function") ack(payload);
};

export const chatSocketHandler = (io) => {
    io.on("connection", (socket) => {
        socket.data.sentAt = [];

        socket.on("joinRoom", async (roomId, ack) => {
            try {
                if (typeof roomId !== "string" || !(await canAccessRoom(socket.userId, roomId))) {
                    return reply(ack, { ok: false, error: "You are not a member of this room" });
                }
                socket.join(roomId);
                socket.broadcast.to(roomId).emit("receiveMessage", {
                    _id: `system-${Date.now()}`,
                    message: `${socket.username} has joined the room`,
                    text: `${socket.username} has joined the room`,
                    sender: "System",
                    senderId: null,
                    createdAt: new Date().toISOString(),
                });
                reply(ack, { ok: true });
            } catch (error) {
                console.error("Socket joinRoom error:", error.message);
                reply(ack, { ok: false, error: "Could not join the room" });
            }
        });

        socket.on("leaveRoom", (roomId) => {
            if (typeof roomId === "string") socket.leave(roomId);
        });

        socket.on("sendMessage", async (payload, ack) => {
            const roomId = payload?.roomId;
            const text = typeof payload?.message === "string" ? payload.message.trim() : "";

            // Only rooms this socket was allowed to join (checked in joinRoom).
            if (typeof roomId !== "string" || !socket.rooms.has(roomId)) {
                return reply(ack, { ok: false, error: "Join the room first" });
            }
            if (!text || text.length > MAX_MESSAGE_LENGTH) {
                return reply(ack, { ok: false, error: `Messages must be 1-${MAX_MESSAGE_LENGTH} characters` });
            }

            const now = Date.now();
            socket.data.sentAt = socket.data.sentAt.filter((t) => now - t < MESSAGE_WINDOW_MS);
            if (socket.data.sentAt.length >= MESSAGE_LIMIT) {
                return reply(ack, { ok: false, error: "You're sending messages too fast" });
            }
            socket.data.sentAt.push(now);

            try {
                // Save first, then broadcast: everyone only sees messages that are stored.
                const saved = await saveMessage({ roomId, userId: socket.userId, text });
                const message = toMessageDTO(saved, socket.username);
                socket.broadcast.to(roomId).emit("receiveMessage", message);
                reply(ack, { ok: true, message });
            } catch (error) {
                console.error("Error saving message:", error.message);
                reply(ack, { ok: false, error: "Message could not be sent" });
            }
        });
    });
};
