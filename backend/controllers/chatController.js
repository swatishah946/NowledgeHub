import Room from "../models/Room.js";
import Message from "../models/Message.js";

// Helper to generate a 6-character random code
const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Create a new chat room with a unique code
export const createRoom = async (req, res) => {
    try {
        const { name } = req.body;
        
        let code = generateRoomCode();
        // Ensure code uniqueness (simple check)
        let existingRoom = await Room.findOne({ code });
        while (existingRoom) {
            code = generateRoomCode();
            existingRoom = await Room.findOne({ code });
        }

        const room = await Room.create({ 
            name, 
            code, 
            createdBy: req.user.id, 
            participants: [req.user.id] 
        });

        res.status(201).json({ message: "Room created", room });
    } catch (err) {
        res.status(500).json({ message: "Error creating room", error: err.message });
    }
};

// Join existing room using the CODE
export const joinRoom = async (req, res) => {
    try {
        const { code } = req.body; // Expect 'code' instead of roomId
        const room = await Room.findOne({ code }); // Find by code
        
        if (!room) return res.status(404).json({ message: "Invalid Room Code" });

        if (!room.participants.includes(req.user.id)) {
            room.participants.push(req.user.id);
            await room.save();
        }

        res.json({ message: "Joined room", room });
    } catch (err) {
        res.status(500).json({ message: "Error joining room", error: err.message });
    }
};

// Fetch messages of a room (No changes needed)
export const getRoomMessages = async (req, res) => {
    try {
        const { roomId } = req.params;
        const messages = await Message.find({ room: roomId }).populate("sender", "name").sort({ timestamp: 1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: "Error fetching messages", error: err.message });
    }
};

// Post message via HTTP (No changes needed)
export const postMessage = async (req, res) => {
    try {
        const { roomId, text } = req.body;
        const message = await Message.create({
            room: roomId,
            sender: req.user.id,
            text
        });
        res.status(201).json({ message: "Message sent", data: message });
    } catch (err) {
        res.status(500).json({ message: "Error sending message", error: err.message });
    }
};

// Fetch recent messages for a room (No changes needed)
export const getRecentMessages = async (req, res) => {
    try {
        const { roomId } = req.params;
        const messages = await Message.find({ room: roomId })
            .populate("sender", "name") 
            .sort({ createdAt: 1 });

        const formattedMessages = messages.map(msg => {
            const senderName = msg.sender ? msg.sender.name : 'Unknown User';
            return {
                message: msg.text,
                sender: senderName,
                createdAt: msg.createdAt 
            };
        });

        res.json(formattedMessages);
    } catch (err) {
        res.status(500).json({ message: "Error fetching recent messages", error: err.message });
    }
};