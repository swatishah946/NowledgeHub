import mongoose from "mongoose";

const vectorDocumentSchema = new mongoose.Schema({
    pageContent: {
        type: String,
        required: true
    },
    metadata: {
        type: Object, // Stores source info, page numbers, etc.
        required: true
    },
    embedding: {
        type: [Number], // The vector embedding
        required: true,
        index: false // We will use a special Vector Search Index in Atlas, not a standard Mongo index
    }
}, { timestamps: true });

const VectorDocument = mongoose.model("VectorDocument", vectorDocumentSchema);

export default VectorDocument;
