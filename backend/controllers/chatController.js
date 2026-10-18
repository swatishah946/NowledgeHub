import Room from "../models/Room.js";
import User from "../models/User.js";
import {
    generateRoomCode,
    isValidRoomCode,
    canAccessRoom,
    saveMessage,
    getRecent,
    toMessageDTO,
    MAX_MESSAGE_LENGTH,
} from "../services/roomService.js";
import { requireString, HttpError } from "../utils/validation.js";

const roomDTO = (room) => ({
    _id: String(room._id),
    name: room.name,
    code: room.code,
    createdBy: room.createdBy ? String(room.createdBy) : null,
    participantCount: room.participants?.length ?? 0,
    createdAt: room.createdAt,
});

// Create a new study room with a unique 6-character code.
export const createRoom = async (req, res) => {
    const name = requireString(req.body?.name, "Room name", { max: 60 });
    const userId = req.user.id;

    // The unique index on `code` rejects duplicates; retry with a new code.
    for (let attempt = 1; attempt <= 5; attempt++) {
        try {
            const room = await Room.create({ name, code: generateRoomCode(), createdBy: userId, participants: [userId] });
            return res.status(201).json(roomDTO(room));
        } catch (error) {
            if (error.code !== 11000) throw error;
        }
    }
    throw new HttpError(503, "Could not create a room right now. Please try again.");
};

// Join an existing room by its code.
export const joinRoom = async (req, res) => {
    const code = requireString(req.body?.code, "Room code", { max: 10 }).toUpperCase();
    if (!isValidRoomCode(code)) throw new HttpError(404, "Room not found");

    // $addToSet is atomic and never adds the same user twice.
    const room = await Room.findOneAndUpdate({ code }, { $addToSet: { participants: req.user.id } }, { new: true });
    if (!room) throw new HttpError(404, "Room not found");

    res.json(roomDTO(room));
};

const assertAccess = async (userId, roomId) => {
    if (!(await canAccessRoom(userId, roomId))) throw new HttpError(403, "You are not a member of this room");
};

export const getRoomMessages = async (req, res) => {
    await assertAccess(req.user.id, req.params.roomId);
    res.json(await getRecent(req.params.roomId, 200));
};

export const getRecentMessages = async (req, res) => {
    await assertAccess(req.user.id, req.params.roomId);
    res.json(await getRecent(req.params.roomId, 50));
};

// REST fallback for sending a message (the app normally uses Socket.IO).
export const postMessage = async (req, res) => {
    const roomId = requireString(req.body?.room, "Room", { max: 50 });
    const text = requireString(req.body?.text, "Message", { max: MAX_MESSAGE_LENGTH });
    await assertAccess(req.user.id, roomId);

    const user = await User.findById(req.user.id).select("name").lean();
    const saved = await saveMessage({ roomId, userId: req.user.id, text });
    res.status(201).json(toMessageDTO(saved, user?.name));
};
