import crypto from "crypto";
import Room from "../models/Room.js";
import Message, { GLOBAL_ROOM_ID } from "../models/Message.js";
import { isObjectId } from "../utils/validation.js";

// No 0/O or 1/I so codes are easy to read out loud. 32^6 ≈ 1.07 billion codes.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 6;
export const MAX_MESSAGE_LENGTH = 2000;

export const generateRoomCode = () =>
    Array.from({ length: ROOM_CODE_LENGTH }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join("");

// Accepts any 6 letters/digits so rooms created with the older UUID-based codes still work.
export const isValidRoomCode = (code) => typeof code === "string" && /^[A-Z0-9]{6}$/.test(code);

/** The global room is open to every logged-in user; other rooms only to participants. */
export const canAccessRoom = async (userId, roomId) => {
    if (roomId === GLOBAL_ROOM_ID) return true;
    if (!isObjectId(roomId)) return false;
    return Boolean(await Room.exists({ _id: roomId, participants: userId }));
};

/** Same shape for REST history and live socket messages, so the UI renders both the same way. */
export const toMessageDTO = (doc, senderName) => ({
    _id: String(doc._id),
    room: doc.room,
    text: doc.text,
    message: doc.text,
    sender: senderName ?? doc.sender?.name ?? "Unknown",
    senderId: doc.sender?._id ? String(doc.sender._id) : doc.sender ? String(doc.sender) : null,
    createdAt: new Date(doc.createdAt).toISOString(),
});

export const saveMessage = async ({ roomId, userId, text }) =>
    Message.create({ room: roomId, sender: userId, text });

export const getRecent = async (roomId, limit = 50) => {
    const docs = await Message.find({ room: roomId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("sender", "name")
        .lean();
    return docs.reverse().map((d) => toMessageDTO(d));
};

export { GLOBAL_ROOM_ID };
