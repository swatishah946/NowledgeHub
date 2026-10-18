import mongoose from "mongoose";

export const GLOBAL_ROOM_ID = "study-group-1";
const THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60; // 2,592,000

const messageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    text: { type: String, required: true, maxlength: 2000 },
    // GLOBAL_ROOM_ID for the public chat, otherwise a Room _id
    room: { type: String, default: GLOBAL_ROOM_ID },
    createdAt: { type: Date, default: Date.now, expires: THIRTY_DAYS_IN_SECONDS }
});

// Serves "latest messages in a room" without scanning the collection.
messageSchema.index({ room: 1, createdAt: -1 });

export default mongoose.model("Message", messageSchema);
