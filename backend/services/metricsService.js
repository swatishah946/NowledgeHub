import mongoose from "mongoose";

// ✅ Metrics Schema
const metricsSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["pdf_upload", "pdf_upload_error", "rag_query", "rag_query_error", "vector_store_cleared", "health_check"],
        required: true
    },
    metricId: String,
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
    
    // Query metrics
    numDocsRetrieved: Number,
    responseLength: Number,
    confidence: Number,
    answerFound: Boolean,
    
    // Timing metrics
    extractDuration: Number,
    chunkingDuration: Number,
    embeddingDuration: Number,
    retrievalDuration: Number,
    generationDuration: Number,
    totalDuration: Number,
    duration: Number,
    
    // User info
    userId: String,
    
    // Timestamps
    timestamp: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now, expires: 2592000 } // 30 days TTL
});

const Metric = mongoose.model("Metric", metricsSchema);

// ✅ Record a metric
export const recordMetric = async (metricData) => {
    try {
        const metric = new Metric(metricData);
        await metric.save();
        console.log(`📊 Metric recorded: ${metricData.type}`);
        return metric;
    } catch (err) {
        console.error("❌ Failed to record metric:", err.message);
        // Don't throw - metrics failure shouldn't crash the app
    }
};

// ✅ Get comprehensive metrics report
export const getMetricsReport = async () => {
    try {
        // Last 24 hours
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // PDF Upload Stats
        const uploadStats = await Metric.aggregate([
            { $match: { type: "pdf_upload", timestamp: { $gte: last24h } } },
            {
                $group: {
                    _id: null,
                    totalUploads: { $sum: 1 },
                    successfulUploads: { $sum: { $cond: ["$success", 1, 0] } },
                    failedUploads: { $sum: { $cond: [{ $not: ["$success"] }, 1, 0] } },
                    totalChunks: { $sum: "$numChunks" },
                    avgUploadTime: { $avg: "$totalDuration" },
                    avgFileSize: { $avg: "$fileSize" }
                }
            }
        ]);

        // RAG Query Stats
        const queryStats = await Metric.aggregate([
            { $match: { type: "rag_query", timestamp: { $gte: last24h } } },
            {
                $group: {
                    _id: null,
                    totalQueries: { $sum: 1 },
                    queriesWithResults: { $sum: { $cond: ["$answerFound", 1, 0] } },
                    avgRetrievalTime: { $avg: "$retrievalDuration" },
                    avgGenerationTime: { $avg: "$generationDuration" },
                    avgTotalTime: { $avg: "$totalDuration" },
                    avgDocsRetrieved: { $avg: "$numDocsRetrieved" },
                    avgConfidence: { $avg: "$confidence" }
                }
            }
        ]);

        // Error Stats
        const errorStats = await Metric.aggregate([
            { $match: { success: false, timestamp: { $gte: last24h } } },
            {
                $group: {
                    _id: "$type",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Retrieval Accuracy (queries with results found)
        const totalQueries = queryStats[0]?.totalQueries || 0;
        const successfulQueries = queryStats[0]?.queriesWithResults || 0;
        const retrievalAccuracy = totalQueries > 0 ? ((successfulQueries / totalQueries) * 100).toFixed(2) : 0;

        return {
            period: "Last 24 Hours",
            summary: {
                retrieval_accuracy: `${retrievalAccuracy}%`,
                total_queries: totalQueries,
                successful_queries: successfulQueries,
                total_uploads: uploadStats[0]?.totalUploads || 0,
                successful_uploads: uploadStats[0]?.successfulUploads || 0
            },
            uploads: uploadStats[0] ? {
                totalUploads: uploadStats[0].totalUploads,
                successfulUploads: uploadStats[0].successfulUploads,
                failedUploads: uploadStats[0].failedUploads,
                totalChunksCreated: Math.round(uploadStats[0].totalChunks),
                avgUploadTime: `${Math.round(uploadStats[0].avgUploadTime)}ms`,
                avgFileSize: `${(uploadStats[0].avgFileSize / 1024 / 1024).toFixed(2)}MB`
            } : { message: "No upload data" },
            queries: queryStats[0] ? {
                totalQueries: queryStats[0].totalQueries,
                queriesWithResults: queryStats[0].queriesWithResults,
                avgRetrievalTime: `${Math.round(queryStats[0].avgRetrievalTime)}ms`,
                avgGenerationTime: `${Math.round(queryStats[0].avgGenerationTime)}ms`,
                avgTotalTime: `${Math.round(queryStats[0].avgTotalTime)}ms`,
                avgDocsRetrieved: Math.round(queryStats[0].avgDocsRetrieved * 10) / 10,
                avgConfidence: (queryStats[0].avgConfidence * 100).toFixed(2) + "%"
            } : { message: "No query data" },
            errors: errorStats.length > 0 ? errorStats : { message: "No errors recorded" }
        };
    } catch (err) {
        console.error("❌ Failed to generate metrics report:", err.message);
        throw err;
    }
};

// ✅ Get metrics for specific user
export const getUserMetrics = async (userId) => {
    try {
        const metrics = await Metric.find({ userId }).sort({ timestamp: -1 }).limit(100);
        return metrics;
    } catch (err) {
        console.error("❌ Failed to fetch user metrics:", err.message);
        throw err;
    }
};

// ✅ Clear old metrics (cleanup job)
export const clearOldMetrics = async (daysOld = 30) => {
    try {
        const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
        const result = await Metric.deleteMany({ timestamp: { $lt: cutoffDate } });
        console.log(`🗑️ Cleared ${result.deletedCount} old metrics`);
        return result;
    } catch (err) {
        console.error("❌ Failed to clear old metrics:", err.message);
        throw err;
    }
};
