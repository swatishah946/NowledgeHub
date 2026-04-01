export const errorHandler = (err, req, res, next) => {
    console.error("🔴 Error:", err);

    // Multer errors
    if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
            success: false,
            error: "File size exceeds 50MB limit"
        });
    }

    if (err.code === "LIMIT_PART_COUNT") {
        return res.status(400).json({
            success: false,
            error: "Too many file parts"
        });
    }

    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            error: `Upload error: ${err.message}`
        });
    }

    // MongoDB errors
    if (err.name === "MongoNetworkError") {
        return res.status(503).json({
            success: false,
            error: "Database connection error",
            timestamp: new Date().toISOString()
        });
    }

    // Default error
    res.status(err.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' 
            ? "Internal server error" 
            : err.message,
        timestamp: new Date().toISOString()
    });
};

export default errorHandler;
