import API from './api';

const errorMessage = (err, fallback) =>
    err?.response?.data?.error || err?.response?.data?.message || err?.message || fallback;

/** Deep Research: returns { response (Markdown report incl. sources), sources } */
export const askDeepResearch = async (query, sessionId) => {
    try {
        const { data } = await API.post('/ai/research', { query, sessionId });
        return { response: data.response, sources: data.sources || [] };
    } catch (err) {
        throw new Error(errorMessage(err, 'Research failed.'));
    }
};

/** History list for the sidebar. mode: 'chat' | 'pdf' | 'research' */
export const getUserHistory = async (mode) => {
    const { data } = await API.get('/ai/history', { params: { mode } });
    return data;
};

export const deleteSession = async (sessionId) => {
    try {
        await API.delete(`/ai/history/${sessionId}`);
        return true;
    } catch (err) {
        throw new Error(errorMessage(err, 'Failed to delete session.'));
    }
};

export const getSession = async (sessionId) => {
    try {
        const { data } = await API.get(`/ai/history/${sessionId}`);
        return data;
    } catch (err) {
        console.error('Failed to fetch session:', err);
        return null;
    }
};

/* ------------------------------ PDF study ------------------------------ */

export const uploadPDF = async (file) => {
    try {
        const formData = new FormData();
        formData.append('pdf', file);
        const { data } = await API.post('/study/upload', formData, { timeout: 5 * 60 * 1000 });
        return data;
    } catch (err) {
        throw new Error(errorMessage(err, 'Failed to upload PDF.'));
    }
};

/** Returns { response, sources: [{ source, page, score, preview }] } */
export const askPDF = async (query, sessionId, source) => {
    try {
        const { data } = await API.post('/study/ask', { query, sessionId, source });
        return { response: data.response, sources: data.sources || [] };
    } catch (err) {
        throw new Error(errorMessage(err, 'Failed to get an answer from your PDFs.'));
    }
};

export const listDocuments = async () => {
    const { data } = await API.get('/study/documents');
    return data.documents || [];
};

export const deleteDocument = async (source) => {
    try {
        await API.delete(`/study/documents/${encodeURIComponent(source)}`);
    } catch (err) {
        throw new Error(errorMessage(err, 'Failed to delete document.'));
    }
};

/* ------------------------------ Chat / quiz / roadmap ------------------------------ */

export const askAI = async (query, sessionId) => {
    try {
        const { data } = await API.post('/ai/chat', { query, sessionId });
        if (data.status === 'success' && data.response) return data.response;
        throw new Error(data.error || 'AI request failed.');
    } catch (err) {
        throw new Error(errorMessage(err, 'An unknown error occurred.'));
    }
};

export const getQuiz = async (topic) => {
    try {
        const { data } = await API.post('/ai/quiz', { topic });
        if (data.status === 'success' && data.quiz) return data.quiz;
        throw new Error(data.error || 'Failed to retrieve quiz from server.');
    } catch (err) {
        throw new Error(errorMessage(err, 'Failed to generate quiz.'));
    }
};

export const getRoadmap = async (goal) => {
    try {
        const { data } = await API.post('/ai/roadmap', { goal });
        if (data.status === 'success' && data.roadmap) return data.roadmap;
        throw new Error(data.error || 'Failed to retrieve roadmap from server.');
    } catch (err) {
        throw new Error(errorMessage(err, 'Failed to generate roadmap.'));
    }
};
