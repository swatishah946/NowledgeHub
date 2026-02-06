import Room from "../models/Room.js";
import Message from "../models/Message.js";
import { v4 as uuidv4 } from "uuid";

// Create a new study room
export const createRoom = async (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.user.id;
        const code = uuidv4().substring(0, 6).toUpperCase(); // Short unique code

        const newRoom = await Room.create({
            name,
            code,
            createdBy: userId,
            participants: [userId]
        });

        res.status(201).json(newRoom);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Join an existing room via code
export const joinRoom = async (req, res) => {
    try {
        const { code } = req.body;
        const userId = req.user.id;

        const room = await Room.findOne({ code });
        if (!room) return res.status(404).json({ message: "Room not found" });

        // Add user if not already a participant
        if (!room.participants.includes(userId)) {
            room.participants.push(userId);
            await room.save();
        }

        res.json(room);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get messages for a specific room
export const getRoomMessages = async (req, res) => {
    try {
        const { roomId } = req.params;
        // roomId here acts as the room code (string) based on Message model using String for room
        // or it could be ObjectId if room in Message was ref.
        // Message schema says: room: { type: String, ... }
        
        const messages = await Message.find({ room: roomId })
            .populate("sender", "name")
            .sort({ createdAt: 1 });

        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Post a new message (API endpoint, backup to Socket)
export const postMessage = async (req, res) => {
    try {
        const { room, text } = req.body;
        const sender = req.user.id;

        const newMessage = await Message.create({
            room,
            text,
            sender
        });

        const fullMessage = await newMessage.populate("sender", "name");

        res.status(201).json(fullMessage);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get recent messages (e.g. for preview or last 50)
export const getRecentMessages = async (req, res) => {
    try {
        const { roomId } = req.params;
        
        const messages = await Message.find({ room: roomId })
            .populate("sender", "name")
            .sort({ createdAt: -1 })
            .limit(50);

        res.json(messages.reverse()); // Return in chronological order
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
