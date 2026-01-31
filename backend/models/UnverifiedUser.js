import mongoose from "mongoose";

const unverifiedUserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    // --- THIS IS THE CHANGE ---
    // The 'expires' property has been removed to prevent automatic deletion.
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("UnverifiedUser", unverifiedUserSchema);