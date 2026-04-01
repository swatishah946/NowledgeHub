import { MongoClient } from "mongodb";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const main = async () => {
    console.log("\n🚀 NowledgeHub RAG Setup Verification\n");

    // 1. Check Environment Variables
    console.log("1️⃣ Checking Environment Variables...");
    const required = ["MONGO_URI", "GEMINI_API_KEY"];
    const missing = required.filter(v => !process.env[v]);

    if (missing.length > 0) {
        console.error(`❌ Missing: ${missing.join(", ")}`);
        process.exit(1);
    }
    console.log("✅ All environment variables present\n");

    // 2. Test MongoDB Connection
    console.log("2️⃣ Testing MongoDB Connection...");
    try {
        const client = new MongoClient(process.env.MONGO_URI);
        await client.connect();
        console.log("✅ MongoDB connection successful");

        // Check database and collection
        const db = client.db("test");
        const collection = db.collection("vectordocuments");
        const count = await collection.countDocuments();
        console.log(`   Documents in vectordocuments: ${count}`);

        // Check indexes
        const indexes = await collection.listSearchIndexes().toArray();
        if (indexes.length === 0) {
            console.warn(`⚠️ No vector search indexes found!`);
            console.warn(`   CREATE ONE: https://www.mongodb.com/docs/atlas/atlas-search/vector-search/setup/setup-atlas-vector-search/`);
        } else {
            console.log(`✅ Found ${indexes.length} vector index(es):`);
            indexes.forEach(idx => {
                console.log(`   - ${idx.name} (${idx.type})`);
            });
        }

        await client.close();
        console.log("");

    } catch (err) {
        console.error(`❌ MongoDB Error: ${err.message}\n`);
        process.exit(1);
    }

    // 3. Test Gemini Embedding
    console.log("3️⃣ Testing Gemini Embedding API...");
    try {
        const embeddings = new GoogleGenerativeAIEmbeddings({
            model: "gemini-embedding-001",
            apiKey: process.env.GEMINI_API_KEY
        });

        const testVector = await embeddings.embedQuery("test query");
        console.log(`✅ Embedding API working`);
        console.log(`   Vector dimension: ${testVector.length}\n`);

    } catch (err) {
        console.error(`❌ Gemini Error: ${err.message}\n`);
        process.exit(1);
    }

    console.log("✅ All checks passed! RAG system is ready.\n");
    console.log("Next steps:");
    console.log("1. npm run dev (to start the server)");
    console.log("2. Upload a PDF via POST /api/study/upload");
    console.log("3. Query via POST /api/study/ask");
    console.log("");
};

main().catch(console.error);
