import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function checkModels() {
    try {
        console.log("Checking models...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        
        const models = (data.models || []).map(m => m.name.replace('models/', ''));
        console.log("Available Models:", models.join(", "));

        const hasFlash = models.includes("gemini-1.5-flash");
        const hasPro = models.includes("gemini-pro");
        const has15Pro = models.includes("gemini-1.5-pro");

        console.log(`\nHas gemini-1.5-flash: ${hasFlash}`);
        console.log(`Has gemini-pro: ${hasPro}`);
        console.log(`Has gemini-1.5-pro: ${has15Pro}`);

    } catch (error) {
        console.error("Error:", error.message);
    }
}

checkModels();
