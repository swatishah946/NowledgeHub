import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        required: true,
        enum: ["user", "model", "assistant"] // 'model' for Gemini, 'assistant' for potential other uses
    },
    content: {
        type: String, // For text content
        required: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed, // For things like quiz scores, roadmap JSON, or research sources
        default: null
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const chatHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    sessionId: {
        type: String,
        required: true,
        index: true
    },
    title: {
        type: String,
        default: "New Session"
    },
    type: {
        type: String,
        required: true,
        enum: ["chat", "research", "quiz", "roadmap", "pdf-chat"]
    },
    messages: [messageSchema],
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Compound index to ensure sessionId is unique per user (optional, but good practice if sessionIds are reused)
// Or just index sessionId if they are UUIDs.
chatHistorySchema.index({ userId: 1, sessionId: 1 });

const ChatHistory = mongoose.model("ChatHistory", chatHistorySchema);

export default ChatHistory;
