// FRONTEND_URL can hold one origin or a comma-separated list, e.g.
// "https://nowledgehub.vercel.app,http://localhost:3000".
export const getAllowedOrigins = () =>
    (process.env.FRONTEND_URL || "http://localhost:3000")
        .split(",")
        .map((o) => o.trim().replace(/\/+$/, ""))
        .filter(Boolean);

// Same rule for REST (cors package) and Socket.IO.
export const corsOptions = {
    origin(origin, callback) {
        // Requests without an Origin header (curl, server-to-server, health checks) are allowed;
        // browsers always send one for cross-site requests.
        if (!origin || getAllowedOrigins().includes(origin)) return callback(null, true);
        return callback(null, false);
    },
    credentials: true,
};
