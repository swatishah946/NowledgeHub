import mongoose from "mongoose";

const quizSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: String, required: true },
    difficulty: { type: String, default: "easy" }
}, { timestamps: true });

export default mongoose.model("Quiz", quizSchema);
