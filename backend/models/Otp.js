import mongoose from "mongoose";

// One pending OTP per email. Only a SHA-256 hash of the code is stored.
// MongoDB's TTL monitor deletes the document once expiresAt has passed.
const otpSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, expires: 0 },
    lastSentAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model("Otp", otpSchema);
