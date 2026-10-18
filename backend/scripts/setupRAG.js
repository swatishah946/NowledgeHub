// Creates or updates the MongoDB Atlas Vector Search index used for PDF search.
//
//   npm run setup:rag             check + create/update the index
//   npm run setup:rag -- --purge  also delete old chunks that can't be searched
//                                 (wrong vector size or no owner)
import "dotenv/config";
import mongoose from "mongoose";
import { AI_CONFIG, RAG_CONFIG } from "../config/ai.js";
import { embedQuery } from "../services/gemini.js";
import { getVectorCollection, expectedIndexDefinition, describeIndexProblems } from "../services/vectorStore.js";

const purge = process.argv.includes("--purge");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const main = async () => {
    console.log("\n🚀 NowledgeHub RAG setup\n");

    for (const key of ["MONGO_URI", "GEMINI_API_KEY"]) {
        if (!process.env[key] && !(key === "GEMINI_API_KEY" && process.env.GOOGLE_API_KEY)) {
            throw new Error(`Missing environment variable ${key}`);
        }
    }

    console.log(`1️⃣ Testing embeddings (${AI_CONFIG.embeddingModel})...`);
    const vector = await embedQuery("test query");
    const dimensions = vector.length;
    console.log(`   ✅ Embedding works, ${dimensions} dimensions\n`);

    console.log("2️⃣ Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10_000 });
    const collection = getVectorCollection();
    // Creating the collection first is required before a search index can be added.
    const db = mongoose.connection.getClient().db(RAG_CONFIG.vectorDbName);
    if (!(await db.listCollections({ name: RAG_CONFIG.vectorCollection }).hasNext())) {
        await db.createCollection(RAG_CONFIG.vectorCollection);
    }
    console.log(`   ✅ Connected (${RAG_CONFIG.vectorDbName}.${RAG_CONFIG.vectorCollection})\n`);

    console.log(`3️⃣ Checking vector index "${RAG_CONFIG.vectorIndexName}"...`);
    const definition = expectedIndexDefinition(dimensions);
    const [existing] = await collection.listSearchIndexes(RAG_CONFIG.vectorIndexName).toArray();
    if (!existing) {
        await collection.createSearchIndex({ name: RAG_CONFIG.vectorIndexName, type: "vectorSearch", definition });
        console.log("   🆕 Index created");
    } else {
        const problems = describeIndexProblems({ ...existing, queryable: true }, dimensions);
        if (problems.length) {
            console.log(`   ⚠️ ${problems.join("; ")}`);
            await collection.updateSearchIndex(RAG_CONFIG.vectorIndexName, definition);
            console.log("   🔄 Index updated");
        } else {
            console.log("   ✅ Index definition is correct");
        }
    }

    process.stdout.write("   ⏳ Waiting for the index to become queryable");
    for (let i = 0; i < 60; i++) {
        const [index] = await collection.listSearchIndexes(RAG_CONFIG.vectorIndexName).toArray();
        if (index?.queryable && index.status === "READY" && describeIndexProblems(index, dimensions).length === 0) {
            console.log(" ✅");
            break;
        }
        if (i === 59) console.log("\n   ⚠️ Still building. Check the Atlas UI in a few minutes.");
        process.stdout.write(".");
        await sleep(5000);
    }

    console.log("\n4️⃣ Creating helper index { userId, source }...");
    await collection.createIndex({ userId: 1, source: 1 });
    console.log("   ✅ Done\n");

    console.log("5️⃣ Checking stored chunks...");
    const unusable = {
        $or: [
            { userId: { $exists: false } },
            { $expr: { $ne: [{ $size: { $ifNull: ["$embedding", []] } }, dimensions] } },
        ],
    };
    const total = await collection.countDocuments();
    const bad = await collection.countDocuments(unusable);
    console.log(`   ${total} chunks stored, ${bad} unusable (old embedding size or no owner)`);
    if (bad && purge) {
        const { deletedCount } = await collection.deleteMany(unusable);
        console.log(`   🗑️ Deleted ${deletedCount} unusable chunks. Users should re-upload those PDFs.`);
    } else if (bad) {
        console.log("   ℹ️ Run again with --purge to delete them (those PDFs must be re-uploaded).");
    }

    console.log("\n✅ RAG setup complete.\n");
};

main()
    .catch((error) => {
        console.error(`\n❌ Setup failed: ${error.message}`);
        if (/vectorSearch|search index/i.test(error.message)) {
            console.error("   If your cluster doesn't allow creating search indexes from code, create it in the Atlas UI");
            console.error("   (Atlas Search → Create Search Index → JSON editor → Vector Search) with this definition:");
            console.error(JSON.stringify({ name: RAG_CONFIG.vectorIndexName, type: "vectorSearch", definition: expectedIndexDefinition() }, null, 2));
        }
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
