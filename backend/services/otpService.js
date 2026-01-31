import dotenv from 'dotenv';
dotenv.config();

import Otp from "../models/Otp.js";
import { transporter } from "../config/nodemailerConfig.js";

export const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

export const sendOtp = async (email) => {
    console.log("📧 Sending OTP to:", email);

    if (!email || email.trim() === "") {
        throw new Error("❌ Email not provided for OTP");
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry

    await Otp.create({ email, otp, expiresAt });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "NowledgeHub Email Verification OTP🔒",
        text: `Your OTP is ${otp}. It expires in 10 minutes.`
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ OTP sent successfully to:", email);
    return otp;
};

export const verifyOtp = async (email, otp) => {
    const record = await Otp.findOne({ email, otp });
    if (!record) return false;
    if (record.expiresAt < Date.now()) return false;
    await Otp.deleteMany({ email }); // clear OTP after use
    return true;
};
