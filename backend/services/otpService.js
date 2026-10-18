import crypto from "crypto";
import nodemailer from "nodemailer";
import Otp from "../models/Otp.js";

export const OTP_CONFIG = {
    length: 6,
    ttlMs: 10 * 60 * 1000, // 10 minutes
    maxAttempts: 5, // wrong guesses allowed per code
    resendCooldownMs: 60 * 1000, // 1 minute between emails
    sendTimeoutMs: 15 * 1000,
};

let transporter = null;
const getTransporter = () => {
    if (transporter) return transporter;
    const port = Number(process.env.EMAIL_PORT) || 587;
    transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || "smtp.gmail.com",
        port,
        secure: port === 465, // 465 = TLS from the start, 587 = STARTTLS
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        connectionTimeout: 15_000,
        socketTimeout: 15_000,
    });
    return transporter;
};

export const isEmailConfigured = () => Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

// crypto.randomInt is cryptographically secure, unlike Math.random.
export const generateOtp = () => crypto.randomInt(0, 10 ** OTP_CONFIG.length).toString().padStart(OTP_CONFIG.length, "0");

// The code is never stored in plain text. The server secret is mixed in so a
// leaked database alone isn't enough to brute-force the hashes offline.
export const hashOtp = (email, otp) =>
    crypto.createHash("sha256").update(`${email}:${otp}:${process.env.JWT_SECRET || ""}`).digest("hex");

const otpEmailHtml = (otp) => `
<div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
  <div style="background-color: white; padding: 30px; border-radius: 8px; max-width: 500px; margin: 0 auto;">
    <h2 style="color: #333;">Email Verification</h2>
    <p style="color: #666;">Welcome to NowledgeHub! Your verification code is:</p>
    <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
      <h1 style="color: #e91e63; letter-spacing: 5px; margin: 0;">${otp}</h1>
    </div>
    <p style="color: #999; font-size: 12px;">This code expires in 10 minutes. If you didn't sign up, ignore this email.</p>
  </div>
</div>`;

const withTimeout = (promise, ms, message) => {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

/**
 * Creates (or replaces) the OTP for an email and sends it.
 * Returns { sent: true } or { sent: false, retryAfterSeconds } when called again too soon.
 */
export const sendOtp = async (email, { enforceCooldown = false } = {}) => {
    if (enforceCooldown) {
        const existing = await Otp.findOne({ email }).lean();
        const elapsed = existing ? Date.now() - new Date(existing.lastSentAt).getTime() : Infinity;
        if (elapsed < OTP_CONFIG.resendCooldownMs) {
            return { sent: false, retryAfterSeconds: Math.ceil((OTP_CONFIG.resendCooldownMs - elapsed) / 1000) };
        }
    }

    const otp = generateOtp();
    await Otp.findOneAndUpdate(
        { email },
        { email, otpHash: hashOtp(email, otp), attempts: 0, expiresAt: new Date(Date.now() + OTP_CONFIG.ttlMs), lastSentAt: new Date() },
        { upsert: true, setDefaultsOnInsert: true }
    );

    if (!isEmailConfigured()) {
        if (process.env.NODE_ENV === "production") throw new Error("Email service is not configured");
        // Local development without SMTP: print the code instead of emailing it.
        console.warn(`⚠️ EMAIL_USER/EMAIL_PASS not set. OTP for ${email}: ${otp}`);
        return { sent: true };
    }

    await withTimeout(
        getTransporter().sendMail({
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: email,
            subject: "🔐 NowledgeHub - Email Verification Code",
            html: otpEmailHtml(otp),
        }),
        OTP_CONFIG.sendTimeoutMs,
        "Email send timeout"
    );
    return { sent: true };
};

/**
 * Checks a code. Returns { ok: true } or { ok: false, reason }.
 * reason: "expired" (no active code), "too_many_attempts", or "invalid".
 */
export const verifyOtp = async (email, enteredOtp) => {
    // Count the attempt atomically BEFORE comparing, so even parallel
    // requests can't make more than maxAttempts guesses at one code.
    const record = await Otp.findOneAndUpdate(
        { email, expiresAt: { $gt: new Date() }, attempts: { $lt: OTP_CONFIG.maxAttempts } },
        { $inc: { attempts: 1 } },
        { new: true }
    );

    if (!record) {
        const existing = await Otp.findOne({ email }).lean();
        if (existing && existing.attempts >= OTP_CONFIG.maxAttempts && existing.expiresAt > new Date()) {
            await Otp.deleteOne({ _id: existing._id });
            return { ok: false, reason: "too_many_attempts" };
        }
        return { ok: false, reason: "expired" };
    }

    const expected = Buffer.from(record.otpHash, "hex");
    const actual = Buffer.from(hashOtp(email, String(enteredOtp).trim()), "hex");
    const matches = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);

    if (!matches) {
        return { ok: false, reason: "invalid", attemptsLeft: Math.max(0, OTP_CONFIG.maxAttempts - record.attempts) };
    }

    await Otp.deleteOne({ _id: record._id }); // single use
    return { ok: true };
};
