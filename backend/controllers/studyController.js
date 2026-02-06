import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { MongoClient } from "mongodb";
import mongoose from "mongoose";
import pdfParse from "pdf-parse";
import dotenv from "dotenv";

dotenv.config();

// ✅ Embeddings (v1, stable)
const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001",
  apiKey: process.env.GEMINI_API_KEY,
});

const client = new MongoClient(process.env.MONGO_URI);

// Initialize Gemini via LangChain
const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GEMINI_API_KEY
});

export const uploadPDF = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    console.log("📄 Processing PDF Upload...");

    // 1. Parse PDF
    const dataBuffer = req.file.buffer;
    const data = await pdfParse(dataBuffer);
    const rawText = data.text;

    // 2. Split Text
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const output = await splitter.createDocuments([rawText]);

    console.log(`🧩 Splitting into ${output.length} chunks...`);

    // 3. Connect to Atlas Vector Store
    await client.connect();
    const collection = client.db("test").collection("vectordocuments");

    await MongoDBAtlasVectorSearch.fromDocuments(output, embeddings, {
      collection,
      indexName: "default", 
      textKey: "text", 
      embeddingKey: "embedding",
    });

    console.log("✅ PDF Indexed Successfully");
    res.json({ message: "PDF uploaded and indexed successfully!" });

  } catch (err) {
    console.error("❌ PDF Processing Error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    // await client.close(); // Keep open for now or manage connection better
  }
};

export const chatWithPDF = async (req, res) => {
  try {
    const { query } = req.body;
    console.log(`🤔 RAG Query: "${query}"`);

    await client.connect();
    const collection = client.db("test").collection("vectordocuments");

    const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
      collection,
      indexName: "default",
      textKey: "text", 
      embeddingKey: "embedding",
    });

    // 1. Retrieve relevant docs
    const retriever = vectorStore.asRetriever(5); // Top 5 chunks
    const relevantDocs = await retriever.getRelevantDocuments(query);

    if (relevantDocs.length === 0) {
      return res.json({ response: "I couldn't find any relevant info in the uploaded PDF." });
    }

    // 2. Combine context
    const context = relevantDocs.map(doc => doc.pageContent).join("\n\n");

    // 3. Generate Answer
    const prompt = `Based on the following context, answer the user's question.
    Context:
    ${context}
    
    Question: ${query}`;

    const result = await model.invoke(prompt);
    res.json({ response: result.content });

  } catch (err) {
    console.error("❌ RAG Chat Error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ---------------- UTILS ---------------- */

export const clearVectorStore = async (req, res) => {
    try {
        const collection = mongoose.connection.db.collection("vectordocuments");
        const result = await collection.deleteMany({});
        console.log(`🗑️ Deleted ${result.deletedCount} documents`);
        res.json({ message: `Cleared ${result.deletedCount} documents` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
