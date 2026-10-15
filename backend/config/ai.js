// Central place for every AI-related setting, so models and limits can be
// changed from environment variables without touching the code.

const int = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const float = (value, fallback) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export const AI_CONFIG = {
    // Gemini 3.6 Flash: main model for chat, PDF answers and research reports.
    chatModel: process.env.GEMINI_CHAT_MODEL || "gemini-3.6-flash",
    // Gemini 3.5 Flash-Lite: cheaper/faster model for simple JSON tasks (quiz, roadmap).
    fastModel: process.env.GEMINI_FAST_MODEL || "gemini-3.5-flash-lite",

    // Embeddings. gemini-embedding-2 is Google's recommended replacement for
    // gemini-embedding-001. 768 dimensions keeps each vector ~6 KB instead of
    // ~24 KB at 3072, which matters on the free Atlas tier.
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2",
    embeddingDimensions: int(process.env.EMBEDDING_DIMENSIONS, 768),
    embeddingBatchSize: 100, // Gemini batchEmbedContents accepts up to 100 inputs per call
    embeddingConcurrency: 2, // batches in flight at once, to stay under rate limits

    // Output caps. Gemini 3 "thinking" tokens count toward this limit, so the
    // caps leave room for reasoning plus the visible answer.
    maxOutputTokens: {
        chat: 8192,
        rag: 8192,
        research: 8192,
        json: 4096,
    },

    // Network behaviour for every Gemini call.
    requestTimeoutMs: int(process.env.GEMINI_TIMEOUT_MS, 60_000),
    maxRetries: int(process.env.GEMINI_MAX_RETRIES, 3),
    retryBaseDelayMs: int(process.env.GEMINI_RETRY_BASE_MS, 1_000),
    retryMaxDelayMs: 10_000,

    // Chat memory: how many previous messages are sent back to the model.
    chatHistoryMessages: 10,
};

export const RAG_CONFIG = {
    chunkSize: 800,
    chunkOverlap: 200,
    separators: ["\n\n", "\n", ".", " "],
    topK: 5,
    // Atlas returns cosine scores normalised to 0..1 ((1 + cos) / 2).
    // 0.5 means cosine 0, i.e. unrelated text, so chunks below it are dropped.
    minScore: float(process.env.RAG_MIN_SCORE, 0.5),
    minTextLength: 100,
    maxChunksPerUpload: int(process.env.RAG_MAX_CHUNKS, 2000),
    maxQueryLength: 5000,
    vectorDbName: process.env.VECTOR_DB_NAME || "test",
    vectorCollection: process.env.VECTOR_COLLECTION || "vectordocuments",
    vectorIndexName: process.env.VECTOR_INDEX_NAME || "default",
};

export const RESEARCH_CONFIG = {
    searchDepth: "advanced",
    maxResults: 5,
    timeoutSeconds: 30,
    maxQueryLength: 500,
};
