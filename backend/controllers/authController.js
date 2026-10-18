import bcrypt from "bcryptjs";
import User from "../models/User.js";
import UnverifiedUser from "../models/UnverifiedUser.js";
import { sendOtp, verifyOtp, OTP_CONFIG } from "../services/otpService.js";
import { createToken } from "../utils/jwtUtils.js";
import { requireString, normalizeEmail, HttpError } from "../utils/validation.js";

const BCRYPT_COST = 10; // 2^10 = 1,024 hashing rounds
// Compared against when the email doesn't exist, so login takes the same time either way.
const DUMMY_HASH = bcrypt.hashSync("nowledgehub-timing-guard", BCRYPT_COST);

const allowedDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "protonmail.com"];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,72}$/;

// Case-insensitive match, so accounts created before emails were lowercased still match.
const CASE_INSENSITIVE = { locale: "en", strength: 2 };
const findUserByEmail = (email) => User.findOne({ email }).collation(CASE_INSENSITIVE);

const validateEmail = (rawEmail) => {
    const email = normalizeEmail(rawEmail);
    if (!EMAIL_REGEX.test(email)) throw new HttpError(400, "❌ Invalid email format");
    const domain = email.slice(email.lastIndexOf("@") + 1);
    if (!allowedDomains.includes(domain)) {
        throw new HttpError(400, `❌ Email provider not supported. Use: ${allowedDomains.join(", ")}`);
    }
    return email;
};

export const register = async (req, res) => {
    const name = requireString(req.body?.name, "Name", { max: 60 });
    const email = validateEmail(req.body?.email);
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!PASSWORD_REGEX.test(password)) {
        throw new HttpError(400, "❌ Password must be 6-72 chars with a letter, a number and a special character (!@#$%^&*)");
    }

    if (await findUserByEmail(email)) {
        throw new HttpError(409, "❌ Email already registered. Please log in.");
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);
    // Replace any earlier, unfinished sign-up for the same email.
    await UnverifiedUser.findOneAndUpdate(
        { email },
        { name, email, password: hashedPassword, createdAt: new Date() },
        { upsert: true, setDefaultsOnInsert: true }
    );

    try {
        await sendOtp(email);
    } catch (error) {
        console.error("❌ OTP sending failed:", error.message);
        throw new HttpError(502, "❌ Failed to send the verification email. Please try again.", "OTP_SEND_FAILED");
    }

    res.status(201).json({
        message: "✅ Registration successful! Please verify your email with the code we sent.",
        email,
    });
};

export const resendOtp = async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const pending = await UnverifiedUser.exists({ email });

    // Same response whether or not the email exists, so this can't be used to discover accounts.
    if (pending) {
        const result = await sendOtp(email, { enforceCooldown: true }).catch((error) => {
            console.error("❌ OTP resend failed:", error.message);
            throw new HttpError(502, "❌ Failed to send the verification email. Please try again.", "OTP_SEND_FAILED");
        });
        if (!result.sent) {
            return res.status(429).json({
                message: `Please wait ${result.retryAfterSeconds}s before requesting another code.`,
                retryAfterSeconds: result.retryAfterSeconds,
            });
        }
    }
    res.json({ message: "If a sign-up is pending for this email, a new code has been sent." });
};

export const verifyUser = async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const otp = requireString(String(req.body?.otp ?? ""), "OTP", { max: 10 });

    const result = await verifyOtp(email, otp);
    if (!result.ok) {
        const message = {
            expired: "❌ This code has expired or was already used. Request a new one.",
            too_many_attempts: `❌ Too many wrong attempts (max ${OTP_CONFIG.maxAttempts}). Request a new code.`,
            invalid: `❌ Incorrect code. ${result.attemptsLeft} attempt(s) left.`,
        }[result.reason];
        throw new HttpError(400, message, result.reason.toUpperCase());
    }

    const pending = await UnverifiedUser.findOne({ email });
    if (!pending) throw new HttpError(404, "❌ Sign-up not found or expired. Please register again.");

    try {
        await User.create({ name: pending.name, email: pending.email, password: pending.password, isVerified: true });
    } catch (error) {
        if (error.code !== 11000) throw error; // duplicate = already verified (double submit)
    }
    await UnverifiedUser.deleteOne({ _id: pending._id });

    res.json({ message: "✅ Email verified successfully! You can now log in.", email });
};

export const login = async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!password) throw new HttpError(400, "❌ Email and password required");

    const user = await findUserByEmail(email);
    // Always run bcrypt so response time doesn't reveal whether the email exists.
    const isMatch = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);

    if (!user || !isMatch) throw new HttpError(400, "❌ Invalid email or password");
    if (!user.isVerified) throw new HttpError(403, "❌ Please verify your email first");

    const token = createToken({ id: user._id.toString() });
    res.json({
        token,
        message: "✅ Login successful",
        user: { id: user._id, name: user.name, email: user.email },
    });
};

export const getMe = async (req, res) => {
    const user = await User.findById(req.user.id).select("name email").lean();
    if (!user) throw new HttpError(404, "❌ User not found");
    res.json({ user, message: "✅ Profile retrieved" });
};
