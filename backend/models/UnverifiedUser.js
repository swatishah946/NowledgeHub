import mongoose from "mongoose";

// Sign-ups waiting for email verification. Removed automatically after 24 hours
// so abandoned registrations don't pile up.
const unverifiedUserSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true }, // bcrypt hash
    createdAt: { type: Date, default: Date.now, expires: 24 * 60 * 60 }
});

export default mongoose.model("UnverifiedUser", unverifiedUserSchema);
