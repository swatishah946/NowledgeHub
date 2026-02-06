import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const apiKey = process.env.GEMINI_API_KEY;

async function check() {
    console.log("Fetching models list...");
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await resp.json();
    if (data.models) {
        console.log("MODELS_START");
        data.models.forEach(m => console.log(m.name.replace('models/', '')));
        console.log("MODELS_END");
    } else {
        console.error("No models found or error:", data);
    }
}

check();
