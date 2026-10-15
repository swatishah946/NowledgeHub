import mongoose from "mongoose";
import { Embeddings } from "@langchain/core/embeddings";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { AI_CONFIG, RAG_CONFIG } from "../config/ai.js";
import { embedTexts, embedQuery } from "./gemini.js";
import { HttpError } from "../utils/validation.js";

// LangChain Embeddings adapter around our Gemini service (retries, timeouts,
// vector validation all live in services/gemini.js).
export class GeminiEmbeddings extends Embeddings {
    constructor() {
        super({});
    }
    embedDocuments(texts) {
        return embedTexts(texts, { kind: "document" });
    }
    embedQuery(text) {
        return embedQuery(text);
    }
}

const embeddings = new GeminiEmbeddings();

// Reuses Mongoose's connection pool instead of opening a second MongoClient.
export const getVectorCollection = () =>
    mongoose.connection.getClient().db(RAG_CONFIG.vectorDbName).collection(RAG_CONFIG.vectorCollection);

export const getVectorStore = () =>
    new MongoDBAtlasVectorSearch(embeddings, {
        collection: getVectorCollection(),
        indexName: RAG_CONFIG.vectorIndexName,
        textKey: "pageContent",
        embeddingKey: "embedding",
    });

/** The Atlas Vector Search index definition this app expects. */
export const expectedIndexDefinition = (dimensions = AI_CONFIG.embeddingDimensions) => ({
    fields: [
        { type: "vector", path: "embedding", numDimensions: dimensions, similarity: "cosine" },
        { type: "filter", path: "userId" },
        { type: "filter", path: "source" },
    ],
});

/** Compares an Atlas index definition with what the app needs. Returns a list of problems. */
export const describeIndexProblems = (index, dimensions = AI_CONFIG.embeddingDimensions) => {
    if (!index) return [`Vector index "${RAG_CONFIG.vectorIndexName}" does not exist`];
    const problems = [];
    const fields = index.latestDefinition?.fields ?? index.definition?.fields ?? [];
    const vector = fields.find((f) => f.type === "vector" && f.path === "embedding");
    if (!vector) problems.push('No vector field on "embedding"');
    else if (Number(vector.numDimensions) !== dimensions) {
        problems.push(`Index has ${vector.numDimensions} dimensions but the embedding model produces ${dimensions}`);
    }
    for (const path of ["userId", "source"]) {
        if (!fields.some((f) => f.type === "filter" && f.path === path)) problems.push(`Missing filter field "${path}"`);
    }
    if (index.queryable === false) problems.push(`Index is not queryable yet (status: ${index.status})`);
    return problems;
};

let indexCheckedAt = 0;
const INDEX_CHECK_TTL_MS = 10 * 60 * 1000;

/** Throws a clear 503 if the vector index is missing or out of date. Result cached for 10 minutes. */
export async function assertVectorIndexReady() {
    if (Date.now() - indexCheckedAt < INDEX_CHECK_TTL_MS) return;
    const indexes = await getVectorCollection().listSearchIndexes(RAG_CONFIG.vectorIndexName).toArray();
    const problems = describeIndexProblems(indexes[0]);
    if (problems.length) {
        console.error(`❌ Vector index problem: ${problems.join("; ")}. Run "npm run setup:rag" in /backend.`);
        throw new HttpError(503, "PDF search is not set up on the server yet. Please try again later.", "VECTOR_INDEX_NOT_READY");
    }
    indexCheckedAt = Date.now();
}

export const resetIndexCache = () => {
    indexCheckedAt = 0;
};
