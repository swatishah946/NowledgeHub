import mongoose from "mongoose";

const THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60; // 2,592,000

const metricsSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["pdf_upload", "pdf_upload_error", "rag_query", "rag_query_error", "vector_store_cleared"],
        required: true,
    },
    fileName: String,
    query: String,
    error: String,
    success: Boolean,

    // Upload metrics
    fileSize: Number,
    numChunks: Number,
    textLength: Number,
    pageCount: Number,
    avgChunkLength: Number,
    deletedCount: Number,

    // Query metrics
    numDocsRetrieved: Number,
    responseLength: Number,
    topScore: Number, // best similarity score returned by Atlas (0..1)
    answerFound: Boolean,

    // Timing metrics (milliseconds) for the 5 pipeline stages
    extractDuration: Number,
    chunkingDuration: Number,
    embeddingDuration: Number,
    retrievalDuration: Number,
    generationDuration: Number,
    totalDuration: Number,
    duration: Number,

    userId: String,
    timestamp: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now, expires: THIRTY_DAYS_IN_SECONDS },
});
metricsSchema.index({ type: 1, timestamp: -1 });

const Metric = mongoose.model("Metric", metricsSchema);

export const recordMetric = async (metricData) => {
    try {
        await Metric.create(metricData);
    } catch (err) {
        // Metrics must never break a user request.
        console.error("❌ Failed to record metric:", err.message);
    }
};

/** Nearest-rank percentile of a list of numbers (p in 0..100). */
export const percentile = (values, p) => {
    const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
    if (!sorted.length) return null;
    const rank = Math.ceil((p / 100) * sorted.length);
    return sorted[Math.min(sorted.length, Math.max(1, rank)) - 1];
};

const stats = (docs, field) => {
    const values = docs.map((d) => d[field]).filter((v) => Number.isFinite(v));
    if (!values.length) return null;
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    return { avg: Math.round(avg), p50: percentile(values, 50), p95: percentile(values, 95), max: Math.max(...values), count: values.length };
};

const MAX_ROWS = 5000;

export const getMetricsReport = async ({ hours = 24 } = {}) => {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const rows = await Metric.find({ timestamp: { $gte: since } })
        .sort({ timestamp: -1 })
        .limit(MAX_ROWS)
        .select("-query -error -userId")
        .lean();

    const uploads = rows.filter((r) => r.type === "pdf_upload");
    const uploadErrors = rows.filter((r) => r.type === "pdf_upload_error");
    const queries = rows.filter((r) => r.type === "rag_query");
    const queryErrors = rows.filter((r) => r.type === "rag_query_error");
    const answered = queries.filter((q) => q.answerFound);

    return {
        period: `Last ${hours} hours`,
        note: "Times are in milliseconds. p50 = median, p95 = 95th percentile.",
        uploads: {
            successful: uploads.length,
            failed: uploadErrors.length,
            totalChunksCreated: uploads.reduce((s, u) => s + (u.numChunks || 0), 0),
            totalPages: uploads.reduce((s, u) => s + (u.pageCount || 0), 0),
            extraction: stats(uploads, "extractDuration"),
            chunking: stats(uploads, "chunkingDuration"),
            embedding: stats(uploads, "embeddingDuration"),
            total: stats(uploads, "totalDuration"),
        },
        queries: {
            successful: queries.length,
            failed: queryErrors.length,
            // Share of questions where at least one relevant chunk passed the score threshold.
            // This is NOT answer accuracy; that needs a labelled test set.
            answerRate: queries.length ? `${((answered.length / queries.length) * 100).toFixed(1)}%` : null,
            avgChunksUsed: answered.length ? Math.round((answered.reduce((s, q) => s + q.numDocsRetrieved, 0) / answered.length) * 10) / 10 : null,
            topSimilarity: (() => {
                const scores = queries.map((q) => q.topScore).filter((v) => Number.isFinite(v));
                if (!scores.length) return null;
                const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
                return { avg: Number(avg.toFixed(3)), p50: percentile(scores, 50) };
            })(),
            retrieval: stats(queries, "retrievalDuration"),
            generation: stats(answered, "generationDuration"),
            total: stats(queries, "totalDuration"),
        },
        sampledRows: rows.length,
    };
};
