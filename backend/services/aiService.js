import { AI_CONFIG } from "../config/ai.js";
import { generateText, generateJson, AIServiceError } from "./gemini.js";

const CHAT_SYSTEM_PROMPT =
    "You are NowledgeHub's AI study assistant. Explain concepts clearly and accurately for students, " +
    "use Markdown (headings, lists, code blocks) when it helps, and say so when you are not sure.";

/**
 * AI chat with conversation memory.
 * history: previous messages [{ role: "user" | "model", text }], oldest first.
 */
export const aiChatBot = async (query, history = []) => {
    const recent = history.slice(-AI_CONFIG.chatHistoryMessages);
    return generateText({
        model: AI_CONFIG.chatModel,
        system: CHAT_SYSTEM_PROMPT,
        messages: [...recent, { role: "user", text: query }],
        maxOutputTokens: AI_CONFIG.maxOutputTokens.chat,
    });
};

/* --------------------------------- Quiz ---------------------------------- */

const QUIZ_QUESTIONS = 5;

const quizSchema = {
    type: "object",
    properties: {
        topic: { type: "string" },
        questions: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    question: { type: "string" },
                    options: { type: "array", items: { type: "string" } },
                    correctAnswer: { type: "string" },
                    explanation: { type: "string" },
                },
                required: ["question", "options", "correctAnswer", "explanation"],
            },
        },
    },
    required: ["topic", "questions"],
};

// Makes sure every question is usable: 4 distinct options and a correct
// answer that is exactly one of them (models sometimes answer "B" or rephrase).
export const validateQuiz = (quiz, topic) => {
    const questions = Array.isArray(quiz?.questions) ? quiz.questions : [];
    const cleaned = [];
    for (const q of questions) {
        const options = Array.isArray(q?.options)
            ? [...new Set(q.options.map((o) => String(o).trim()).filter(Boolean))]
            : [];
        if (!q?.question || options.length < 2) continue;

        let answer = String(q.correctAnswer ?? "").trim();
        if (!options.includes(answer)) {
            const letter = /^[A-D]$/i.test(answer) ? answer.toUpperCase().charCodeAt(0) - 65 : -1;
            const byLetter = letter >= 0 ? options[letter] : undefined;
            const byText = options.find((o) => o.toLowerCase() === answer.toLowerCase());
            answer = byText ?? byLetter;
        }
        if (!answer) continue;
        cleaned.push({
            question: String(q.question).trim(),
            options,
            correctAnswer: answer,
            explanation: String(q.explanation ?? "").trim(),
        });
    }
    if (cleaned.length === 0) {
        throw new AIServiceError("Failed to generate a valid quiz. Please try again.", { status: 502, code: "QUIZ_INVALID" });
    }
    return { topic: String(quiz?.topic || topic), questions: cleaned.slice(0, QUIZ_QUESTIONS) };
};

export const generateQuiz = async (topic) => {
    const quiz = await generateJson({
        model: AI_CONFIG.fastModel,
        system: "You write accurate multiple-choice quizzes for students. Return only JSON.",
        prompt:
            `Create a multiple-choice quiz about: "${topic}". ` +
            `Exactly ${QUIZ_QUESTIONS} questions, each with exactly 4 options. ` +
            "correctAnswer must be copied exactly from one of the options. Keep explanations to one or two sentences.",
        schema: quizSchema,
    });
    return validateQuiz(quiz, topic);
};

/* -------------------------------- Roadmap -------------------------------- */

const ROADMAP_STEPS = 4;

const roadmapSchema = {
    type: "object",
    properties: {
        goal: { type: "string" },
        estimatedDuration: { type: "string" },
        steps: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                    title: { type: "string" },
                    description: { type: "string" },
                    duration: { type: "string" },
                    resources: { type: "array", items: { type: "string" } },
                },
                required: ["title", "description", "duration", "resources"],
            },
        },
    },
    required: ["goal", "estimatedDuration", "steps"],
};

export const validateRoadmap = (roadmap, goal) => {
    const steps = (Array.isArray(roadmap?.steps) ? roadmap.steps : [])
        .filter((s) => s?.title)
        .slice(0, ROADMAP_STEPS)
        .map((s, i) => ({
            id: i + 1,
            title: String(s.title).trim(),
            description: String(s.description ?? "").trim(),
            duration: String(s.duration ?? "").trim(),
            resources: Array.isArray(s.resources) ? s.resources.map(String).filter(Boolean) : [],
        }));
    if (steps.length === 0) {
        throw new AIServiceError("Failed to generate a valid roadmap. Please try again.", { status: 502, code: "ROADMAP_INVALID" });
    }
    return { goal: String(roadmap?.goal || goal), estimatedDuration: String(roadmap?.estimatedDuration ?? ""), steps };
};

export const generateRoadmap = async (goal) => {
    const roadmap = await generateJson({
        model: AI_CONFIG.fastModel,
        system: "You design practical learning roadmaps for students. Return only JSON.",
        prompt:
            `Create a learning roadmap for: "${goal}". Include exactly ${ROADMAP_STEPS} distinct, ordered steps ` +
            "with a realistic duration and 2-3 well-known free resources each.",
        schema: roadmapSchema,
    });
    return validateRoadmap(roadmap, goal);
};
