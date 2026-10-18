// Quick check that the Gemini API key and the configured models work.
//   npm run check:gemini
import "dotenv/config";
import { AI_CONFIG } from "../config/ai.js";
import { generateText, embedQuery } from "../services/gemini.js";

const check = async (label, fn) => {
    const start = Date.now();
    try {
        const result = await fn();
        console.log(`✅ ${label} (${Date.now() - start} ms) → ${result}`);
        return true;
    } catch (error) {
        const cause = error.cause?.message ?? error.message;
        console.log(`❌ ${label} → ${error.code ?? ""} ${cause}`);
        return false;
    }
};

console.log("\n🔑 Checking Gemini API access\n");
if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    console.log("❌ GEMINI_API_KEY is not set in backend/.env");
    process.exit(1);
}

const results = [
    await check(`Chat model ${AI_CONFIG.chatModel}`, () =>
        generateText({ model: AI_CONFIG.chatModel, prompt: "Reply with exactly: OK", maxOutputTokens: 1024 }).then((t) => t.trim())),
    await check(`Fast model ${AI_CONFIG.fastModel}`, () =>
        generateText({ model: AI_CONFIG.fastModel, prompt: "Reply with exactly: OK", maxOutputTokens: 256 }).then((t) => t.trim())),
    await check(`Embeddings ${AI_CONFIG.embeddingModel}`, () => embedQuery("hello world").then((v) => `${v.length} dimensions`)),
];

if (results.includes(false)) {
    console.log(`
Common fixes:
 • "authentication failed": Google now rejects unrestricted standard API keys.
   Create a new key in Google AI Studio (new keys are auth keys) or restrict
   your existing key to the Gemini API, then update GEMINI_API_KEY.
 • "model is unavailable": check the model names in GEMINI_CHAT_MODEL /
   GEMINI_FAST_MODEL / GEMINI_EMBEDDING_MODEL.
`);
    process.exit(1);
}
console.log("\nAll good ✅\n");
