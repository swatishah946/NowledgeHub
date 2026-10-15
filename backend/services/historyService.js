import ChatHistory from "../models/ChatHistory.js";

const MAX_MESSAGES_PER_SESSION = 200;

const titleFor = (type, query) => {
    const label = { chat: "Chat", research: "Research", quiz: "Quiz", roadmap: "Roadmap", "pdf-chat": "PDF" }[type] || "Chat";
    const short = query.length > 40 ? `${query.slice(0, 40)}…` : query;
    return `${label}: ${short}`;
};

/**
 * Appends one user/model exchange to a session owned by `userId`.
 * The filter always includes userId, so one user can never write into
 * another user's session even if they guess its ID.
 */
export const saveExchange = async ({ userId, sessionId, type, query, response, metadata = null }) => {
    if (!userId || !sessionId) return;
    try {
        await ChatHistory.updateOne(
            { userId, sessionId },
            {
                $setOnInsert: { type, title: titleFor(type, query) },
                $set: { isDeleted: false },
                $push: {
                    messages: {
                        $each: [
                            { role: "user", content: query },
                            { role: "model", content: typeof response === "string" ? response : JSON.stringify(response), metadata },
                        ],
                        $slice: -MAX_MESSAGES_PER_SESSION,
                    },
                },
            },
            { upsert: true }
        );
    } catch (error) {
        // History is a convenience: never fail the user's request because of it.
        console.error("❌ History save error:", error.message);
    }
};

/** Previous messages of a session, oldest first, in the format the AI service expects. */
export const loadConversation = async ({ userId, sessionId, limit = 10 }) => {
    if (!userId || !sessionId) return [];
    const session = await ChatHistory.findOne(
        { userId, sessionId, isDeleted: false },
        { messages: { $slice: -limit } }
    ).lean();
    return (session?.messages ?? []).map((m) => ({
        role: m.role === "user" ? "user" : "model",
        text: m.content,
    }));
};
