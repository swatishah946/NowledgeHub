import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log("Testing Embedding Model...");

const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "text-embedding-004",
    taskType: TaskType.RETRIEVAL_DOCUMENT,
    title: "PDF Chunk",
    apiKey: process.env.GEMINI_API_KEY
});

try {
    const res = await embeddings.embedQuery("Hello world");
    console.log("✅ Embedding generated successfully!");
    console.log("Vector length:", res.length);
} catch (error) {
    console.error("❌ Embedding Failed:", error);
}
