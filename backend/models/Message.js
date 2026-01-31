// // Ai-Amrit-School/backend/models/Message.js

// import mongoose from "mongoose";

// const messageSchema = new mongoose.Schema({
//     room: { type: String, required: true }, // Changed to String to store room ID
//     sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//     text: { type: String, required: true },
//     // --- START: New Feature ---
//     // The 'createdAt' field will now be used for the TTL index
//     createdAt: { type: Date, default: Date.now, expires: '30d' } 
//     // --- END: New Feature ---
// });

// // To make this work, ensure you have a TTL index in your MongoDB.
// // Mongoose will automatically create this index for you.

// export default mongoose.model("Message", messageSchema);





import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Username or "You"
    text: { type: String, required: true },
    room: { type: String, default: "general" }, // Support for different rooms
    createdAt: { 
        type: Date, 
        default: Date.now, 
        expires: 2592000 // 30 Days in seconds (30 * 24 * 60 * 60)
    }
});

export default mongoose.model("Message", messageSchema);