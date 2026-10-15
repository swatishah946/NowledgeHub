// Imported first by every test file so config modules see these values.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET ??= "test-secret";
process.env.GEMINI_API_KEY ??= "test-key";
process.env.GEMINI_RETRY_BASE_MS = "1"; // keep retry tests fast
process.env.GEMINI_MAX_RETRIES = "3";
process.env.FRONTEND_URL = "https://nowledgehub.vercel.app,http://localhost:3000";
