import { aiChatBot } from "../services/aiService.js";

console.log("START TEST ---");
console.log(
  "✅ GEMINI_API_KEY is present (length:",
  process.env.GEMINI_API_KEY?.length,
  ")"
);

try {
  const res = await aiChatBot("Reply with OK only");
  console.log("🤖 Gemini Response:", res);
} catch (e) {
  console.error("❌ Test Failed:", e);
}
