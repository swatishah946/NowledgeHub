import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined in the .env file.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 1. Chat Model
// UPDATED: Switching to 'gemini-1.5-flash' for better quota limits
const chatModel = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash", 
    safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ]
});

// 2. Schema Definitions
const roadmapSchema = {
    type: "OBJECT",
    properties: {
      goal: { type: "STRING" },
      estimatedDuration: { type: "STRING" },
      steps: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            id: { type: "NUMBER" },
            title: { type: "STRING" },
            description: { type: "STRING" },
            duration: { type: "STRING" },
            resources: { type: "ARRAY", items: { type: "STRING" } }
          },
          required: ["id", "title", "description", "duration", "resources"]
        }
      }
    },
    required: ["goal", "estimatedDuration", "steps"]
};
  
const quizSchema = {
    type: "OBJECT",
    properties: {
        topic: { type: "STRING" },
        questions: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    question: { type: "STRING" },
                    options: { type: "ARRAY", items: { type: "STRING" } },
                    correctAnswer: { type: "STRING" },
                    explanation: { type: "STRING" }
                },
                required: ["question", "options", "correctAnswer", "explanation"]
            }
        }
    },
    required: ["topic", "questions"]
};

// 3. Structured Output Models
const roadmapModel = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: roadmapSchema,
    },
});
  
const quizModel = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: quizSchema,
    },
});

/**
 * ✅ AI ChatBot
 */
/**
 * ✅ AI ChatBot (History Aware)
 * @param {string} query - Current user message
 * @param {Array} history - Previous conversation history [{ role: 'user'|'model', parts: [{ text: '' }] }]
 */
export const aiChatBot = async (query, history = []) => {
    try {
        const chat = chatModel.startChat({
            history: history,
            generationConfig: {
                maxOutputTokens: 8192, // Increased from 1000 to prevent truncation
            },
        });

        const result = await chat.sendMessage(query);
        return result.response.text();
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
        const prompt = `Generate a multiple-choice quiz about: "${topic}". It must have exactly 5 questions.`;
        const result = await quizModel.generateContent(prompt);
        return JSON.parse(result.response.text());
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
        const prompt = `Create a learning roadmap for: "${goal}". Include 4 distinct steps.`;
        const result = await roadmapModel.generateContent(prompt);
        return JSON.parse(result.response.text());
    } catch (error) {
        console.error("❌ Gemini Roadmap Error:", error);
        throw new Error("Failed to generate roadmap.");
    }
};