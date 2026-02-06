
import { tavily } from "@tavily/core";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Initialize Tavily
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

export const performDeepResearch = async (req, res) => {
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ error: "Query is required" });
    }

    try {
        console.log(`🔎 Starting Deep Research for: "${query}"`);

        // 1. Perform Search with Tavily
        const searchResult = await tvly.search(query, {
            search_depth: "advanced",
            max_results: 5,
            include_answer: true,
            include_domains: [] // Optional restriction
        });

        console.log("✅ Tavily Search Complete. Context retrieved.");

        // 2. Format Context for LLM
        let context = `Search Query: ${query}\n\n`;
        context += `Tavily AI Answer: ${searchResult.answer}\n\n`;
        context += `Search Results:\n`;
        
        searchResult.results.forEach((result, index) => {
            context += `[${index + 1}] Title: ${result.title}\n`;
            context += `    URL: ${result.url}\n`;
            context += `    Content: ${result.content}\n\n`;
        });

        // 3. Generate Report with Gemini
        // ... (keep prompt same)

        const prompt = `
        You are an expert research assistant. 
        Using the provided search results below, write a comprehensive "Deep Research Report" in Markdown format.
        
        Structure:
        1. **Title**: A clear title for the report.
        2. **Executive Summary**: A concise summary of the findings.
        3. **Detailed Findings**: Break down the information logically using headers.
        4. **Sources**: List the sources used with their URLs (e.g., [Title](URL)).

        Do not make up information. Use only the provided context.
        
        ---
        CONTEXT:
        ${context}
        `;

        const result = await model.generateContent(prompt);
        const report = result.response.text();

        console.log("✅ Gemini Report Generated.");

        // --- SAVE TO HISTORY ---
        const { sessionId, userId } = req.body;
        if (sessionId) {
            let uid = userId || (req.user ? req.user.id : null); 
            if (!uid) {
                uid = new mongoose.Types.ObjectId(); 
            }
            // Dynamic Import to avoid top-level issues if any
            const { default: ChatHistory } = await import("../models/ChatHistory.js");
             
             // Check if session exists to handle ownership transfer
             const existingSession = await ChatHistory.findOne({ sessionId });
             let updateSet = { type: 'research' };
             
             // If new session or existing session has different user (orphan/guest), adopt it
             if (!existingSession || (req.user && existingSession.userId.toString() !== req.user.id)) {
                 updateSet.userId = uid;
             } else if (!existingSession.userId) {
                 updateSet.userId = uid;
             }

             await ChatHistory.updateOne(
                 { sessionId },
                 { 
                     $set: updateSet,
                     $setOnInsert: { title: `Research: ${query}` },
                     $push: { messages: [
                        { role: 'user', content: `Research: ${query}` },
                        { role: 'model', content: report, metadata: { type: 'research_report', sources: searchResult.results } }
                     ]}
                 },
                 { upsert: true }
             );
        }
        // -----------------------

        res.json({ 
            response: report, 
            sources: searchResult.results,
            status: "success" 
        });

    } catch (error) {
        console.error("❌ Deep Research Error:", error);
        res.status(500).json({ 
            error: "Deep Research failed", 
            details: error.message 
        });
    }
};