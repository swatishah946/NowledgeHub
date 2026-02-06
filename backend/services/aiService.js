import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tavily } from "@tavily/core";
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined in the .env file.");
}

// 1. Chat Model (LangChain)
const chatModel = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash", // Using 2.5-flash via LangChain
    maxOutputTokens: 8192,
    apiKey: process.env.GEMINI_API_KEY
});

// 2. Structured Output Models 
// (For simplicity and stability, we'll use standard generation with prompts for now, 
// or simpler LangChain calls, as schema handling differs. 
// Keeping it simple to avoid breaking changes with complex schema logic in this step if possible, 
// but user code had explicit schemas. 
// LangChain supports structured output but it's different. 
// To minimize risk, I will implement specific generators using the chat model with strict prompting for JSON, 
// OR keep it simple if the user allows. 
// User wants to REMOVE @google/generative-ai. 
// I will implement helper functions using the chat model.)

/**
 * ✅ AI ChatBot
 */
export const aiChatBot = async (query) => {
    try {
        const response = await chatModel.invoke([
            ["system", "You are a helpful AI study assistant."],
            ["human", query]
        ]);
        return response.content;
    } catch (error) {
        console.error("❌ Gemini Chat Error:", error);
        throw new Error("I'm having trouble thinking right now. Please try again later.");
    }
};

/**
 * ✅ Quiz Generator
 */
export const generateQuiz = async (topic) => {
    try {
        const prompt = `Generate a multiple-choice quiz about: "${topic}". It must have exactly 5 questions. Return JSON only. schema: { topic: string, questions: [{ question: string, options: string[], correctAnswer: string, explanation: string }] }`;
        const response = await chatModel.invoke(prompt);
        // Basic cleanup for markdown json blocks if present
        const text = response.content.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (error) {
        console.error("❌ Gemini Quiz Error:", error);
        throw new Error("Failed to generate quiz.");
    }
};

/**
 * ✅ Roadmap Generator
 */
export const generateRoadmap = async (goal) => {
    try {
        const prompt = `Create a learning roadmap for: "${goal}". Include 4 distinct steps. Return JSON only. schema: { goal: string, estimatedDuration: string, steps: [{ id: number, title: string, description: string, duration: string, resources: string[] }] }`;
        const response = await chatModel.invoke(prompt);
         // Basic cleanup for markdown json blocks if present
         const text = response.content.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (error) {
        console.error("❌ Gemini Roadmap Error:", error);
        throw new Error("Failed to generate roadmap.");
    }
};

/**
 * ✅ Deep Research Agent
 */
export const deepResearch = async (topic) => {
    try {
        console.log(`🔎 Researching: ${topic}`);
        
        // 1. Search Web with Tavily
        const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
        const searchResult = await tvly.search(topic, {
            search_depth: "advanced",
            max_results: 5,
        });

        // 2. Synthesize with Gemini
        const context = searchResult.results.map(r => `[${r.title}](${r.url}): ${r.content}`).join("\n\n");
        
        const prompt = `You are a Deep Research Agent. Write a comprehensive report on: "${topic}".
        
        Use the following real-time web search results as your primary source:
        ${context}

        Structure the report with markdown:
        - Introduction
        - Key Findings
        - Detailed Analysis
        - Conclusion
        - References (Citations)
        `;

        const response = await chatModel.invoke(prompt);
        return response.content;

    } catch (error) {
        console.error("❌ Deep Research Error:", error);
        throw new Error("Failed to conduct research. Ensure TAVILY_API_KEY is set.");
    }
};
