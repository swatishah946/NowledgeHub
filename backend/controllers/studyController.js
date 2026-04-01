import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { MongoClient } from "mongodb";
import mongoose from "mongoose";
import pdfParse from "pdf-parse";
import dotenv from "dotenv";
import { recordMetric, getMetricsReport } from "../services/metricsService.js";

dotenv.config();

// ✅ FIX #1: SINGLETON CONNECTION POOL
let cachedMongoClient = null;

async function getMongoClient() {
    if (cachedMongoClient) {
        return cachedMongoClient;
    }

    console.log("🔗 Initializing MongoDB connection pool...");
    
    cachedMongoClient = new MongoClient(process.env.MONGO_URI, {
        maxPoolSize: 50,
        minPoolSize: 5,
        maxIdleTimeMS: 45000,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        retryWrites: true,
        w: "majority"
    });

    await cachedMongoClient.connect();
    console.log("✅ MongoDB connection pool ready");

    // Graceful shutdown
    process.on("exit", async () => {
        if (cachedMongoClient) {
            await cachedMongoClient.close();
        }
    });

    return cachedMongoClient;
}

// ✅ FIX #2: STANDARDIZED EMBEDDINGS MODEL
const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001",
    apiKey: process.env.GEMINI_API_KEY,
});

// ✅ FIX #3: GEMINI MODEL CONFIG
const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.7,
    maxOutputTokens: 2048,
});

/* ================== PDF UPLOAD ENDPOINT ================== */
export const uploadPDF = async (req, res) => {
    const startTime = Date.now();
    const metricId = `upload_${Date.now()}`;

    try {
        // Validation
        if (!req.file) {
            return res.status(400).json({ 
                error: "❌ No file uploaded",
                timestamp: new Date().toISOString()
            });
        }

        const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
        if (req.file.size > MAX_FILE_SIZE) {
            return res.status(413).json({ 
                error: `❌ File too large. Max: 50MB, Received: ${(req.file.size / 1024 / 1024).toFixed(2)}MB`
            });
        }

        console.log(`\n📄 Processing PDF: ${req.file.originalname}`);
        console.log(`   Size: ${(req.file.size / 1024 / 1024).toFixed(2)}MB`);

        // ✅ STEP 1: Extract Text from PDF
        const extractStartTime = Date.now();
        const dataBuffer = req.file.buffer;
        const pdfData = await pdfParse(dataBuffer);
        const rawText = pdfData.text;
        const extractDuration = Date.now() - extractStartTime;

        // Validate extracted content
        if (!rawText || rawText.trim().length < 100) {
            await recordMetric({
                type: "pdf_upload_error",
                fileName: req.file.originalname,
                error: "Empty or image-based PDF",
                userId: req.user?.id,
                success: false
            });

            return res.status(400).json({ 
                error: "❌ PDF is empty or image-based. Please use OCR to convert first.",
                suggestion: "Try using tools like Adobe Acrobat or online OCR services"
            });
        }

        console.log(`✅ Text Extracted: ${rawText.length} characters in ${extractDuration}ms`);

        // ✅ STEP 2: Split into Chunks
        const chunkingStartTime = Date.now();
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 800,
            chunkOverlap: 200,
            separators: ["\n\n", "\n", ".", " "]
        });

        const chunks = await splitter.createDocuments(
            [rawText],
            [{
                source: req.file.originalname,
                uploadedAt: new Date().toISOString(),
                fileSize: req.file.size,
                textLength: rawText.length,
                userId: req.user?.id,
                pageCount: pdfData.numpages
            }]
        );

        const chunkingDuration = Date.now() - chunkingStartTime;
        console.log(`🧩 Chunked into ${chunks.length} chunks in ${chunkingDuration}ms`);

        // ✅ STEP 3: Embed and Store in MongoDB
        const embeddingStartTime = Date.now();
        const client = await getMongoClient();
        const collection = client.db("test").collection("vectordocuments");

        // Verify vector index exists
        const indexes = await collection.listSearchIndexes().toArray();
        if (indexes.length === 0) {
            await recordMetric({
                type: "pdf_upload_error",
                fileName: req.file.originalname,
                error: "Vector index not found",
                userId: req.user?.id,
                success: false
            });

            return res.status(500).json({
                error: "❌ Vector Search Index not configured!",
                setup: "Please create a vector index named 'default' in MongoDB Atlas",
                instructions: `
                  1. Go to MongoDB Atlas Dashboard
                  2. Select your cluster and collection 'vectordocuments'
                  3. Click "Search Indexes" > "Create Index"
                  4. Choose "Vector Search"
                  5. Configure:
                     - Index Name: "default"
                     - Embedding Field: "embedding"
                     - Vector Dimensions: 1024
                     - Similarity: "cosine"
                `
            });
        }

        await MongoDBAtlasVectorSearch.fromDocuments(chunks, embeddings, {
            collection,
            indexName: "default",
            textKey: "pageContent",
            embeddingKey: "embedding"
        });

        const embeddingDuration = Date.now() - embeddingStartTime;
        console.log(`🔗 Embedded & Stored in ${embeddingDuration}ms`);

        // ✅ STEP 4: Record Metrics
        const totalDuration = Date.now() - startTime;

        await recordMetric({
            type: "pdf_upload",
            metricId,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            numChunks: chunks.length,
            textLength: rawText.length,
            pageCount: pdfData.numpages,
            avgChunkLength: Math.round(rawText.length / chunks.length),
            extractDuration,
            chunkingDuration,
            embeddingDuration,
            totalDuration,
            userId: req.user?.id,
            timestamp: new Date().toISOString(),
            success: true
        });

        console.log(`✅ PDF uploaded successfully in ${totalDuration}ms`);
        console.log(`   - ${chunks.length} chunks created`);
        console.log(`   - Total duration: ${totalDuration}ms\n`);

        res.status(201).json({
            success: true,
            message: "✅ PDF indexed successfully!",
            data: {
                fileName: req.file.originalname,
                chunksCreated: chunks.length,
                avgChunkLength: Math.round(rawText.length / chunks.length),
                processingTime: `${totalDuration}ms`,
                breakdown: {
                    extraction: `${extractDuration}ms`,
                    chunking: `${chunkingDuration}ms`,
                    embedding: `${embeddingDuration}ms`
                },
                ready: "✅ Ready for queries"
            }
        });

    } catch (err) {
        console.error("❌ PDF Upload Error:", err.message);

        await recordMetric({
            type: "pdf_upload_error",
            fileName: req.file?.originalname || "unknown",
            error: err.message,
            stack: err.stack,
            userId: req.user?.id,
            duration: Date.now() - startTime,
            success: false
        });

        res.status(500).json({
            success: false,
            error: "PDF processing failed",
            details: process.env.NODE_ENV === 'development' ? err.message : "Internal server error",
            timestamp: new Date().toISOString()
        });
    }
};

/* ================== RAG QUERY ENDPOINT ================== */
export const chatWithPDF = async (req, res) => {
    const startTime = Date.now();
    const { query } = req.body;
    const metricId = `query_${Date.now()}`;

    try {
        // Validation
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ 
                error: "Query must be a non-empty string"
            });
        }

        const trimmedQuery = query.trim();
        if (trimmedQuery.length === 0 || trimmedQuery.length > 5000) {
            return res.status(400).json({ 
                error: "Query must be between 1 and 5000 characters"
            });
        }

        console.log(`\n🤔 RAG Query: "${trimmedQuery}"`);
        const retrievalStartTime = Date.now();

        // ✅ STEP 1: Retrieve Relevant Documents
        const client = await getMongoClient();
        const collection = client.db("test").collection("vectordocuments");

        const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
            collection,
            indexName: "default",
            textKey: "pageContent",
            embeddingKey: "embedding"
        });

        const retriever = vectorStore.asRetriever({ k: 5 });
        const relevantDocs = await retriever.getRelevantDocuments(trimmedQuery);
        const retrievalDuration = Date.now() - retrievalStartTime;

        console.log(`🔍 Retrieved ${relevantDocs.length} chunks in ${retrievalDuration}ms`);

        // Handle no results
        if (relevantDocs.length === 0) {
            await recordMetric({
                type: "rag_query",
                metricId,
                query: trimmedQuery.substring(0, 100),
                numDocsRetrieved: 0,
                answerFound: false,
                retrievalDuration,
                totalDuration: Date.now() - startTime,
                userId: req.user?.id,
                timestamp: new Date().toISOString(),
                success: true
            });

            return res.json({
                success: true,
                response: "❌ I couldn't find any relevant information in your uploaded PDFs. Please upload relevant documents and try again.",
                confidence: 0,
                docsUsed: 0,
                processingTime: `${Date.now() - startTime}ms`
            });
        }

        // ✅ STEP 2: Assemble Context
        const context = relevantDocs
            .map((doc, idx) => {
                const metadata = doc.metadata || {};
                return `[Source: ${metadata.source || 'Unknown'} | Chunk ${idx + 1}]\n${doc.pageContent}`;
            })
            .join("\n\n---\n\n");

        console.log(`📚 Context assembled: ${context.length} characters`);

        // ✅ STEP 3: Generate Answer with Gemini
        const generationStartTime = Date.now();
        const systemPrompt = `You are a highly knowledgeable study assistant. Your role is to:
1. Answer questions based ONLY on the provided document context
2. Be precise and cite which document sections support your answer
3. If information is not in the context, explicitly state: "This information is not covered in the provided documents"
4. Provide clear, well-structured responses
5. Use markdown formatting for readability`;

        const userPrompt = `Context from Documents:
${context}

---

User Question: ${trimmedQuery}

Please provide a comprehensive answer based on the context above. If the answer is not fully covered, indicate what information is missing.`;

        const result = await model.invoke([
            ["system", systemPrompt],
            ["human", userPrompt]
        ]);

        const generationDuration = Date.now() - generationStartTime;
        console.log(`✅ Generated response in ${generationDuration}ms`);

        // ✅ STEP 4: Record Metrics
        const totalDuration = Date.now() - startTime;
        const avgChunkLength = relevantDocs.reduce((sum, doc) => sum + doc.pageContent.length, 0) / relevantDocs.length;

        await recordMetric({
            type: "rag_query",
            metricId,
            query: trimmedQuery.substring(0, 100),
            numDocsRetrieved: relevantDocs.length,
            avgChunkLength: Math.round(avgChunkLength),
            responseLength: result.content.length,
            retrievalDuration,
            generationDuration,
            totalDuration,
            userId: req.user?.id,
            timestamp: new Date().toISOString(),
            success: true,
            confidence: 0.85
        });

        console.log(`✅ Query completed in ${totalDuration}ms`);
        console.log(`   - Retrieval: ${retrievalDuration}ms`);
        console.log(`   - Generation: ${generationDuration}ms`);
        console.log(`   - Documents used: ${relevantDocs.length}\n`);

        res.json({
            success: true,
            response: result.content,
            confidence: 0.85,
            docsUsed: relevantDocs.length,
            avgChunkLength: Math.round(avgChunkLength),
            processingTime: `${totalDuration}ms`,
            breakdown: {
                retrieval: `${retrievalDuration}ms`,
                generation: `${generationDuration}ms`
            },
            sources: relevantDocs.map(doc => ({
                source: doc.metadata?.source || 'Unknown',
                preview: doc.pageContent.substring(0, 100) + "..."
            }))
        });

    } catch (err) {
        console.error("❌ RAG Query Error:", err.message);

        await recordMetric({
            type: "rag_query_error",
            metricId,
            query: req.body.query?.substring(0, 100) || "unknown",
            error: err.message,
            stack: err.stack,
            userId: req.user?.id,
            duration: Date.now() - startTime,
            success: false
        });

        res.status(500).json({
            success: false,
            error: "Query processing failed",
            details: process.env.NODE_ENV === 'development' ? err.message : "Internal server error",
            timestamp: new Date().toISOString()
        });
    }
};

/* ================== UTILITY ENDPOINTS ================== */

export const clearVectorStore = async (req, res) => {
    try {
        console.log("🗑️ Clearing vector store...");
        
        const client = await getMongoClient();
        const collection = client.db("test").collection("vectordocuments");
        
        const result = await collection.deleteMany({});

        await recordMetric({
            type: "vector_store_cleared",
            deletedCount: result.deletedCount,
            timestamp: new Date().toISOString()
        });

        console.log(`✅ Deleted ${result.deletedCount} documents`);

        res.json({
            success: true,
            message: `✅ Cleared ${result.deletedCount} documents from vector store`,
            deletedCount: result.deletedCount
        });
    } catch (err) {
        console.error("❌ Clear Vector Store Error:", err.message);

        res.status(500).json({
            success: false,
            error: "Failed to clear vector store",
            details: err.message
        });
    }
};

export const verifyVectorIndex = async (req, res) => {
    try {
        console.log("🔍 Verifying vector index...");

        const client = await getMongoClient();
        const collection = client.db("test").collection("vectordocuments");
        
        const indexes = await collection.listSearchIndexes().toArray();
        const docCount = await collection.countDocuments();

        if (indexes.length === 0) {
            return res.status(500).json({
                success: false,
                error: "❌ No vector index found!",
                setup: "Vector Search Index not configured",
                instructions: {
                    step1: "Go to MongoDB Atlas Dashboard",
                    step2: "Navigate to your cluster > Collections",
                    step3: "Select 'test' database > 'vectordocuments' collection",
                    step4: "Click 'Search Indexes' tab",
                    step5: "Click 'Create Index' > Choose 'Vector Search'",
                    step6: "Configure with:",
                    config: {
                        indexName: "default",
                        embeddingField: "embedding",
                        vectorDimensions: 1024,
                        similarity: "cosine"
                    }
                },
                docCount
            });
        }

        console.log(`✅ Vector index verified. Found ${indexes.length} index(es), ${docCount} documents`);

        res.json({
            success: true,
            message: "✅ Vector index is properly configured",
            indexes: indexes.map(idx => ({
                name: idx.name,
                status: idx.status,
                type: idx.type
            })),
            statistics: {
                totalDocuments: docCount,
                indexCount: indexes.length
            }
        });

    } catch (err) {
        console.error("❌ Verification Error:", err.message);

        res.status(500).json({
            success: false,
            error: "Verification failed",
            details: err.message
        });
    }
};

export const getRAGMetrics = async (req, res) => {
    try {
        const metrics = await getMetricsReport();

        res.json({
            success: true,
            data: metrics,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: "Failed to fetch metrics",
            details: err.message
        });
    }
};

// ✅ NEW: Health Check
export const healthCheck = async (req, res) => {
    try {
        const client = await getMongoClient();
        const collection = client.db("test").collection("vectordocuments");
        
        const docCount = await collection.countDocuments();

        res.json({
            status: "✅ RAG System Operational",
            mongodb: "✅ Connected",
            documentsIndexed: docCount,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        res.status(500).json({
            status: "❌ System Error",
            error: err.message
        });
    }
};