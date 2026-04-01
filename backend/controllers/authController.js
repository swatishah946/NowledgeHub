import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import UnverifiedUser from "../models/UnverifiedUser.js";
import { sendOtp, verifyOtp } from "../services/otpService.js";

const allowedDomains = [
    'gmail.com',
    'yahoo.com',
    'outlook.com',
    'hotmail.com',
    'icloud.com',
    'protonmail.com'
];

// ✅ FIX: Add timeout and better error handling
export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        console.log(`\n📝 Registration attempt: ${email}`);

        // ✅ STEP 1: Validate inputs
        if (!name || !email || !password) {
            return res.status(400).json({ 
                message: "❌ Name, email, and password are required" 
            });
        }

        // ✅ STEP 2: Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                message: "❌ Invalid email format" 
            });
        }

        // ✅ STEP 3: Validate email domain
        const domain = email.substring(email.lastIndexOf("@") + 1).toLowerCase();
        if (!allowedDomains.includes(domain)) {
            return res.status(400).json({ 
                message: `❌ Email provider not supported. Use: ${allowedDomains.join(', ')}` 
            });
        }

        // ✅ STEP 4: Validate password strength
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ 
                message: "❌ Password must be 6+ chars with letter, number, and special char (!@#$%^&*)"
            });
        }

        // ✅ STEP 5: Check if user already exists (with timeout)
        console.log("🔍 Checking if user exists...");
        
        let existingUser = null;
        let unverifiedUser = null;

        try {
            // Use Promise.race to add timeout
            existingUser = await Promise.race([
                User.findOne({ email }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Database query timeout")), 5000)
                )
            ]);
        } catch (err) {
            console.error("❌ Database query timeout:", err.message);
            return res.status(503).json({ 
                message: "❌ Database connection timeout. Please try again.",
                error: "SERVICE_UNAVAILABLE"
            });
        }

        if (existingUser) {
            return res.status(409).json({ 
                message: "❌ Email already registered. Please log in." 
            });
        }

        // ✅ STEP 6: Clear any existing unverified user with same email
        try {
            await UnverifiedUser.deleteOne({ email });
            console.log("✅ Cleared existing unverified record");
        } catch (err) {
            console.error("⚠️ Error clearing unverified user:", err.message);
            // Continue anyway
        }

        // ✅ STEP 7: Hash password
        console.log("🔐 Hashing password...");
        const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ STEP 8: Create unverified user
        console.log("💾 Creating unverified user...");
        await UnverifiedUser.create({
            name,
            email,
            password: hashedPassword
        });
        console.log("✅ Unverified user created");

        // ✅ STEP 9: Send OTP
        console.log("📧 Sending OTP...");
        try {
            await sendOtp(email);
            console.log(`✅ OTP sent to ${email}`);
        } catch (err) {
            console.error("❌ OTP sending failed:", err.message);
            // Don't fail registration if OTP fails - user can retry
            return res.status(500).json({ 
                message: "❌ Failed to send OTP. Please try again.",
                error: "OTP_SEND_FAILED"
            });
        }

        // ✅ Success
        console.log(`✅ Registration successful for ${email}\n`);
        res.status(201).json({ 
            message: "✅ Registration successful! Please verify your email with the OTP sent.",
            email
        });

    } catch (error) {
        console.error("❌ Registration error:", error.message);
        console.error("Stack:", error.stack);

        // Handle specific error types
        if (error.message.includes("timeout")) {
            return res.status(503).json({ 
                message: "❌ Request timeout. Please try again.",
                error: "TIMEOUT"
            });
        }

        if (error.code === 11000) {
            return res.status(409).json({ 
                message: "❌ Email already exists"
            });
        }

        res.status(500).json({ 
            message: "❌ Registration failed",
            error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
        });
    }
};

// ✅ FIX: Verification endpoint
export const verifyUser = async (req, res) => {
    try {
        const { email, otp } = req.body;

        console.log(`\n🔐 Verification attempt for: ${email}`);

        if (!email || !otp) {
            return res.status(400).json({ 
                message: "❌ Email and OTP required" 
            });
        }

        // ✅ Verify OTP with timeout
        console.log("✔️ Verifying OTP...");
        let isValid = false;

        try {
            isValid = await Promise.race([
                verifyOtp(email, otp),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("OTP verification timeout")), 5000)
                )
            ]);
        } catch (err) {
            console.error("❌ OTP verification timeout:", err.message);
            return res.status(503).json({ 
                message: "❌ Verification timeout. Please try again." 
            });
        }

        if (!isValid) {
            return res.status(400).json({ 
                message: "❌ Invalid or expired OTP" 
            });
        }

        console.log("✅ OTP verified");

        // ✅ Move user from UnverifiedUser to User
        console.log("📂 Moving user to verified collection...");
        
        const unverifiedUser = await UnverifiedUser.findOne({ email });
        if (!unverifiedUser) {
            return res.status(404).json({ 
                message: "❌ Verification failed. Please register again." 
            });
        }

        // Create verified user
        await User.create({
            name: unverifiedUser.name,
            email: unverifiedUser.email,
            password: unverifiedUser.password,
            isVerified: true
        });

        console.log("✅ User moved to verified collection");

        // Clean up unverified record
        await UnverifiedUser.deleteOne({ email });
        console.log("✅ Unverified record deleted");

        res.json({ 
            message: "✅ Email verified successfully! You can now log in.",
            email
        });

    } catch (error) {
        console.error("❌ Verification error:", error.message);

        if (error.message.includes("timeout")) {
            return res.status(503).json({ 
                message: "❌ Verification timeout. Please try again." 
            });
        }

        res.status(500).json({ 
            message: "❌ Verification failed",
            error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
        });
    }
};

// ✅ FIX: Login endpoint
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log(`\n🔑 Login attempt: ${email}`);

        if (!email || !password) {
            return res.status(400).json({ 
                message: "❌ Email and password required" 
            });
        }

        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(400).json({ 
                message: "❌ Invalid credentials" 
            });
        }

        if (!user.isVerified) {
            return res.status(403).json({ 
                message: "❌ Please verify your email first" 
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ 
                message: "❌ Incorrect password" 
            });
        }

        const token = jwt.sign(
            { id: user._id }, 
            process.env.JWT_SECRET, 
            { expiresIn: "7d" }
        );

        console.log(`✅ Login successful for ${email}\n`);

        res.json({ 
            token, 
            message: "✅ Login successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("❌ Login error:", error.message);
        res.status(500).json({ 
            message: "❌ Login failed",
            error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
        });
    }
};

// ✅ FIX: Get user profile
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('name email');
        
        if (!user) {
            return res.status(404).json({ 
                message: "❌ User not found" 
            });
        }

        res.json({ 
            user,
            message: "✅ Profile retrieved"
        });

    } catch (error) {
        console.error("❌ Get profile error:", error.message);
        res.status(500).json({ 
            message: "❌ Failed to fetch profile",
            error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
        });
    }
};