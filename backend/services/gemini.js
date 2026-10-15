// Thin wrapper around the official Google Gen AI SDK (@google/genai).
// Every call goes through withRetry (exponential backoff + jitter) and has a
// per-attempt timeout, so a slow or rate-limited Gemini call can't hang a request.

import { GoogleGenAI } from "@google/genai";
import { AI_CONFIG } from "../config/ai.js";
import { withRetry, getStatus } from "../utils/retry.js";

export class AIServiceError extends Error {
    constructor(message, { status = 502, code = "AI_ERROR", cause } = {}) {
        super(message);
        this.name = "AIServiceError";
        this.status = status;
        this.code = code;
        this.cause = cause;
    }
}

let client = null;

const getApiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

export const getClient = () => {
    if (client) return client;
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new AIServiceError("AI service is not configured on the server.", {
            status: 503,
            code: "GEMINI_KEY_MISSING",
        });
    }
    client = new GoogleGenAI({ apiKey });
    return client;
};

// Lets tests inject a fake client.
export const __setClientForTests = (fake) => {
    client = fake;
};

// Turns raw SDK errors into errors with a safe message for users and a
// clear hint in the server logs (most production failures are key problems).
export const toAIServiceError = (error) => {
    if (error instanceof AIServiceError) return error;
    const status = Number(getStatus(error));
    const raw = String(error?.message ?? "");

    if (/API key not valid|API_KEY_INVALID|unregistered callers|unrestricted|API key expired|key.{0,40}blocked|blocked.{0,40}key/i.test(raw) || status === 401) {
        console.error(
            "❌ Gemini rejected the API key. Create a new key in Google AI Studio (new keys are auth keys) " +
            "or restrict your existing key to the Gemini API, then update GEMINI_API_KEY."
        );
        return new AIServiceError("AI service authentication failed. Please try again later.", {
            status: 503,
            code: "GEMINI_AUTH",
            cause: error,
        });
    }
    if (status === 403) {
        console.error("❌ Gemini returned 403 PERMISSION_DENIED. Check the key's restrictions and that the Gemini API is enabled for its project.");
        return new AIServiceError("AI service authentication failed. Please try again later.", {
            status: 503,
            code: "GEMINI_PERMISSION",
            cause: error,
        });
    }
    if (status === 404) {
        console.error(`❌ Gemini model not found: ${raw}`);
        return new AIServiceError("The configured AI model is unavailable.", { status: 503, code: "GEMINI_MODEL", cause: error });
    }
    if (status === 429) {
        return new AIServiceError("The AI service is busy right now. Please try again in a minute.", {
            status: 429,
            code: "GEMINI_RATE_LIMIT",
            cause: error,
        });
    }
    if (error?.name === "AbortError" || /timed? ?out|aborted/i.test(raw)) {
        return new AIServiceError("The AI service took too long to respond. Please try again.", {
            status: 504,
            code: "GEMINI_TIMEOUT",
            cause: error,
        });
    }
    return new AIServiceError("The AI service failed to respond. Please try again.", {
        status: 502,
        code: "GEMINI_ERROR",
        cause: error,
    });
};

const callWithRetry = (label, fn) =>
    withRetry(fn, {
        retries: AI_CONFIG.maxRetries,
        baseDelayMs: AI_CONFIG.retryBaseDelayMs,
        maxDelayMs: AI_CONFIG.retryMaxDelayMs,
        onRetry: (error, attempt, delay) =>
            console.warn(`⚠️ ${label} failed (status ${getStatus(error) ?? "network"}), retry ${attempt}/${AI_CONFIG.maxRetries} in ${delay}ms`),
    }).catch((error) => {
        throw toAIServiceError(error);
    });

const httpOptions = () => ({ timeout: AI_CONFIG.requestTimeoutMs });

/**
 * messages: [{ role: "user" | "model", text }]. The last message must be from
 * the user (Gemini 3 rejects requests that end with a model turn).
 */
export const toContents = (messages) =>
    messages
        .filter((m) => m && typeof m.text === "string" && m.text.trim())
        .map((m) => ({ role: m.role === "model" ? "model" : "user", parts: [{ text: m.text }] }));

export async function generateText({ model = AI_CONFIG.chatModel, system, messages, prompt, maxOutputTokens = AI_CONFIG.maxOutputTokens.chat, json }) {
    const contents = messages ? toContents(messages) : toContents([{ role: "user", text: prompt }]);
    if (!contents.length || contents[contents.length - 1].role !== "user") {
        throw new AIServiceError("Invalid AI request.", { status: 400, code: "BAD_AI_REQUEST" });
    }

    const config = { maxOutputTokens, httpOptions: httpOptions() };
    if (system) config.systemInstruction = system;
    if (json) {
        config.responseMimeType = "application/json";
        if (json.schema) config.responseJsonSchema = json.schema;
    }

    const ai = getClient();
    const response = await callWithRetry(`Gemini ${model}`, () =>
        ai.models.generateContent({ model, contents, config })
    );

    const text = response?.text;
    if (!text || !text.trim()) {
        const finish = response?.candidates?.[0]?.finishReason;
        const blocked = response?.promptFeedback?.blockReason;
        console.error(`❌ Empty Gemini response (finishReason=${finish}, blockReason=${blocked})`);
        throw new AIServiceError(
            blocked ? "This request was blocked by the AI safety filters." : "The AI returned an empty response. Please try again.",
            { status: 502, code: "GEMINI_EMPTY" }
        );
    }
    if (response?.candidates?.[0]?.finishReason === "MAX_TOKENS") {
        console.warn(`⚠️ Gemini ${model} hit maxOutputTokens (${maxOutputTokens}); answer may be cut short.`);
    }
    return text;
}

// Pulls the first JSON object out of a model response, even if it is wrapped
// in ```json fences or surrounded by stray text.
export const extractJson = (text) => {
    const cleaned = String(text).replace(/```(?:json)?/gi, "").trim();
    try {
        return JSON.parse(cleaned);
    } catch {
        const start = cleaned.indexOf("{");
        const end = cleaned.lastIndexOf("}");
        if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
        throw new AIServiceError("The AI returned invalid data. Please try again.", { status: 502, code: "GEMINI_BAD_JSON" });
    }
};

export async function generateJson({ model = AI_CONFIG.fastModel, system, prompt, schema, maxOutputTokens = AI_CONFIG.maxOutputTokens.json }) {
    const text = await generateText({ model, system, prompt, maxOutputTokens, json: { schema } });
    try {
        return extractJson(text);
    } catch (error) {
        throw error instanceof AIServiceError
            ? error
            : new AIServiceError("The AI returned invalid data. Please try again.", { status: 502, code: "GEMINI_BAD_JSON" });
    }
}

/* ------------------------------- Embeddings ------------------------------- */

const isEmbedding2 = (model) => model.includes("gemini-embedding-2");

// gemini-embedding-2 has no taskType; Google recommends text prefixes instead.
const formatForEmbedding = (text, kind, title, model) => {
    if (!isEmbedding2(model)) return text;
    return kind === "query"
        ? `task: search result | query: ${text}`
        : `title: ${title || "none"} | text: ${text}`;
};

export const normalize = (vector) => {
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return norm > 0 ? vector.map((v) => v / norm) : vector;
};

async function embedBatch(texts, { kind, titles, model, dimensions }) {
    const config = { outputDimensionality: dimensions, httpOptions: httpOptions() };
    if (!isEmbedding2(model)) config.taskType = kind === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT";

    // Each text is its own Content object. Passing plain strings to
    // gemini-embedding-2 would merge them into ONE embedding.
    const contents = texts.map((text, i) => ({
        role: "user",
        parts: [{ text: formatForEmbedding(text, kind, titles?.[i], model) }],
    }));

    const ai = getClient();
    const response = await callWithRetry(`Embedding ${model}`, () =>
        ai.models.embedContent({ model, contents, config })
    );
    return (response?.embeddings ?? []).map((e) => e?.values ?? []);
}

const assertVectors = (vectors, count, dimensions) => {
    if (vectors.length !== count) return false;
    return vectors.every((v) => Array.isArray(v) && v.length === dimensions);
};

/**
 * Embeds texts and guarantees one vector of the right size per text.
 * Throws instead of silently storing empty vectors.
 */
export async function embedTexts(texts, { kind = "document", titles } = {}) {
    const model = AI_CONFIG.embeddingModel;
    const dimensions = AI_CONFIG.embeddingDimensions;
    const batchSize = AI_CONFIG.embeddingBatchSize;

    const batches = [];
    for (let i = 0; i < texts.length; i += batchSize) {
        batches.push({ start: i, texts: texts.slice(i, i + batchSize), titles: titles?.slice(i, i + batchSize) });
    }

    const results = new Array(batches.length);
    let next = 0;
    const worker = async () => {
        while (next < batches.length) {
            const index = next++;
            const batch = batches[index];
            let vectors = await embedBatch(batch.texts, { kind, titles: batch.titles, model, dimensions });
            if (!assertVectors(vectors, batch.texts.length, dimensions) && batch.texts.length > 1) {
                // Fallback: embed one at a time if the batch response looks wrong.
                vectors = [];
                for (let j = 0; j < batch.texts.length; j++) {
                    const [single] = await embedBatch([batch.texts[j]], {
                        kind,
                        titles: batch.titles ? [batch.titles[j]] : undefined,
                        model,
                        dimensions,
                    });
                    vectors.push(single ?? []);
                }
            }
            if (!assertVectors(vectors, batch.texts.length, dimensions)) {
                throw new AIServiceError("Embedding failed: the AI returned incomplete vectors.", {
                    status: 502,
                    code: "EMBEDDING_INVALID",
                });
            }
            results[index] = vectors.map(normalize);
        }
    };

    const workers = Array.from({ length: Math.min(AI_CONFIG.embeddingConcurrency, batches.length) }, worker);
    await Promise.all(workers);
    return results.flat();
}

export async function embedQuery(text) {
    const [vector] = await embedTexts([text], { kind: "query" });
    return vector;
}
