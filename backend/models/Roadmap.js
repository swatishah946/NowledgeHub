import mongoose from "mongoose";

const roadmapSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    goal: { type: String, required: true },
    steps: [{
        title: String,
        description: String,
        resources: [String],
        status: { type: String, default: "pending" }  // pending, in-progress, done
    }]
}, { timestamps: true });

export default mongoose.model("Roadmap", roadmapSchema);
