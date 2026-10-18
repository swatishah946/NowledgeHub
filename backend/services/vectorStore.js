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
let ensuring = null;

/**
 * Creates the Atlas Vector Search index (or updates it if the dimensions or
 * filter fields are wrong). Runs automatically at startup, so no manual setup
 * is needed. Atlas builds the index in the background (about a minute).
 */
export function ensureVectorIndex() {
    ensuring ??= (async () => {
        const db = mongoose.connection.getClient().db(RAG_CONFIG.vectorDbName);
        const name = RAG_CONFIG.vectorIndexName;
        if (!(await db.listCollections({ name: RAG_CONFIG.vectorCollection }).hasNext())) {
            await db.createCollection(RAG_CONFIG.vectorCollection);
        }
        const collection = getVectorCollection();
        const definition = expectedIndexDefinition();
        const [index] = await collection.listSearchIndexes(name).toArray();

        if (!index) {
            await collection.createSearchIndex({ name, type: "vectorSearch", definition });
            console.log(`🆕 Created vector search index "${name}" (${AI_CONFIG.embeddingDimensions} dims). Atlas needs about a minute to build it.`);
        } else if (describeIndexProblems({ ...index, queryable: true }).length) {
            await collection.updateSearchIndex(name, definition);
            console.log(`🔄 Updated vector search index "${name}" to ${AI_CONFIG.embeddingDimensions} dims with userId/source filters.`);
        } else {
            console.log(`✅ Vector search index "${name}" is set up (status: ${index.status}).`);
        }
        await collection.createIndex({ userId: 1, source: 1 });
    })()
        .catch((error) => {
            console.error(
                `❌ Could not create the vector search index automatically: ${error.message}\n` +
                "   Make sure the cluster is MongoDB Atlas and the database user can manage search indexes " +
                '(e.g. role "readWriteAnyDatabase"), or run "npm run setup:rag".'
            );
            throw error;
        })
        .finally(() => {
            ensuring = null;
        });
    return ensuring;
}

/**
 * Throws a clear 503 if the vector index is missing, out of date or still
 * building. If it's missing or wrong, it is created/fixed on the spot.
 * A good result is cached for 10 minutes.
 */
export async function assertVectorIndexReady() {
    if (Date.now() - indexCheckedAt < INDEX_CHECK_TTL_MS) return;
    let index;
    try {
        [index] = await getVectorCollection().listSearchIndexes(RAG_CONFIG.vectorIndexName).toArray();
    } catch (error) {
        console.error(`❌ Could not read vector search indexes: ${error.message}`);
        throw new HttpError(503, "PDF search is unavailable right now. Please try again later.", "VECTOR_INDEX_UNAVAILABLE");
    }
    const definitionProblems = index ? describeIndexProblems({ ...index, queryable: true }) : ["missing"];

    if (definitionProblems.length) {
        console.warn(`⚠️ Vector index problem (${definitionProblems.join("; ")}). Fixing it now...`);
        await ensureVectorIndex().catch(() => {});
        throw new HttpError(503, "PDF search is being set up. Please try again in a minute.", "VECTOR_INDEX_BUILDING");
    }
    if (index.queryable === false || (index.status && index.status !== "READY")) {
        throw new HttpError(503, "PDF search is being set up. Please try again in a minute.", "VECTOR_INDEX_BUILDING");
    }
    indexCheckedAt = Date.now();
}

export const resetIndexCache = () => {
    indexCheckedAt = 0;
};
