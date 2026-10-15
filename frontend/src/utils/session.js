// Random, unguessable IDs for AI conversations (one per mode).
export const newSessionId = () => {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

const STORAGE_KEY = 'nh_sessions';

export const loadSessionIds = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        return {
            chat: saved.chat || newSessionId(),
            pdf: saved.pdf || newSessionId(),
            research: saved.research || newSessionId(),
        };
    } catch {
        return { chat: newSessionId(), pdf: newSessionId(), research: newSessionId() };
    }
};

export const saveSessionIds = (ids) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
        /* storage unavailable: ids just won't persist */
    }
};
