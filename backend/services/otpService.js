import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// ✅ Validate email credentials
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️ EMAIL_USER or EMAIL_PASS not configured!");
}

// ✅ Create transporter with timeout
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    socketTimeout: 30000,  // ✅ 30 second timeout
    connectionTimeout: 30000
});

// ✅ Verify connection on startup
transporter.verify((error, success) => {
    if (error) {
        console.error("⚠️ Email service not ready:", error.message);
    } else {
        console.log("✅ Email service verified");
    }
});

// Store OTPs in memory (for demo - use Redis in production)
const otpStore = new Map();

export const sendOtp = async (email) => {
    try {
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store OTP with 10-minute expiry
        otpStore.set(email, {
            otp,
            expiresAt: Date.now() + 10 * 60 * 1000
        });

        console.log(`📧 Sending OTP to: ${email}`);

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: '🔐 NowledgeHub - Email Verification OTP',
            html: `
                <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
                    <div style="background-color: white; padding: 30px; border-radius: 8px; max-width: 500px; margin: 0 auto;">
                        <h2 style="color: #333;">Email Verification</h2>
                        <p style="color: #666;">Welcome to NowledgeHub! Your OTP is:</p>
                        <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
                            <h1 style="color: #e91e63; letter-spacing: 5px; margin: 0;">${otp}</h1>
                        </div>
                        <p style="color: #999; font-size: 12px;">This OTP will expire in 10 minutes.</p>
                    </div>
                </div>
            `
        };

        // ✅ Send with timeout
        const info = await Promise.race([
            transporter.sendMail(mailOptions),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Email send timeout")), 15000)
            )
        ]);

        console.log(`✅ OTP sent successfully: ${info.response}`);
        return { success: true, otp };

    } catch (error) {
        console.error("❌ Failed to send OTP:", error.message);
        throw new Error(`Failed to send OTP: ${error.message}`);
    }
};

export const verifyOtp = async (email, enteredOtp) => {
    try {
        const stored = otpStore.get(email);

        if (!stored) {
            console.error("❌ No OTP found for:", email);
            return false;
        }

        if (Date.now() > stored.expiresAt) {
            console.error("❌ OTP expired for:", email);
            otpStore.delete(email);
            return false;
        }

        const isValid = stored.otp === enteredOtp.toString();

        if (isValid) {
            console.log(`✅ OTP verified for: ${email}`);
            otpStore.delete(email);  // Clear after verification
        } else {
            console.error("❌ Invalid OTP for:", email);
        }

        return isValid;

    } catch (error) {
        console.error("❌ OTP verification error:", error.message);
        return false;
    }
};