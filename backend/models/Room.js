import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 60 },
    code: { type: String, required: true, unique: true }, // 6-character join code
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });

export default mongoose.model("Room", roomSchema);
