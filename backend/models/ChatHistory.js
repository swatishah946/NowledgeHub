import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        required: true,
        enum: ["user", "model", "assistant"]
    },
    content: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null }, // quiz JSON, roadmap JSON, sources...
    timestamp: { type: Date, default: Date.now }
});

const chatHistorySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sessionId: { type: String, required: true },
    title: { type: String, default: "New Session" },
    type: {
        type: String,
        required: true,
        enum: ["chat", "research", "quiz", "roadmap", "pdf-chat"]
    },
    messages: [messageSchema],
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

// A session belongs to exactly one user.
chatHistorySchema.index({ userId: 1, sessionId: 1 }, { unique: true });
// History sidebar: a user's sessions, newest first.
chatHistorySchema.index({ userId: 1, isDeleted: 1, updatedAt: -1 });

export default mongoose.model("ChatHistory", chatHistorySchema);
