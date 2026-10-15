import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true }, // bcrypt hash
    isVerified: { type: Boolean, default: false },
    learningProgress: {
        quizzesTaken: { type: Number, default: 0 },
        topicsMastered: { type: Number, default: 0 }
    }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
