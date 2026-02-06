import API from './api';

// ... (existing exports)

/**
 * Perform Deep Research
 * @param {string} query 
 * @param {string} sessionId (Optional)
 * @param {string} userId (Optional)
 */
export const askDeepResearch = async (query, sessionId, userId) => {
  try {
    const { data } = await API.post('/ai/research', { query, sessionId, userId });
    if (data.status === 'success') {
      return data.response; // Returns Markdown report
    }
    throw new Error(data.error || 'Research failed.');
  } catch (err) {
    throw new Error(err.response?.data?.error || err.message || 'Research failed.');
  }
};

/**
 * Fetch User History
 * @param {string} userId (Optional)
 * @param {string} mode (Optional) - 'chat', 'research', 'pdf'
 */
export const getUserHistory = async (userId, mode) => {
  try {
    const { data } = await API.get(`/ai/history`, { params: { userId, mode } });
    return data;
  } catch (err) {
    console.error("Failed to fetch history:", err);
    return [];
  }
};

/**
 * Delete a Session
 * @param {string} sessionId 
 */
export const deleteSession = async (sessionId) => {
  try {
    await API.delete(`/ai/history/${sessionId}`);
    return true;
  } catch (err) {
    throw new Error(err.response?.data?.error || 'Failed to delete session.');
  }
};

// ... (existing exports)

/**
 * Upload PDF for RAG
 * @param {File} file 
 */
export const uploadPDF = async (file) => {
    try {
        const formData = new FormData();
        formData.append('pdf', file);
        
        const { data } = await API.post('/study/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return data;
    } catch (err) {
        throw new Error(err.response?.data?.error || 'Failed to upload PDF.');
    }
};

/**
 * Ask PDF (RAG Chat)
 * @param {string} query 
 */
export const askPDF = async (query) => {
    try {
        const { data } = await API.post('/study/ask', { query });
        return data.response;
    } catch (err) {
        throw new Error(err.response?.data?.error || 'Failed to get answer from PDF.');
    }
};

/**
 * Get Full Session Details
 * @param {string} sessionId 
 */
export const getSession = async (sessionId) => {
    try {
        const { data } = await API.get(`/ai/history/${sessionId}`);
        return data;
    } catch (err) {
        console.error("Failed to fetch session:", err);
        return null; // Return null if not found
    }
};

// Update askAI to include sessionId for memory
export const askAI = async (query, sessionId, type) => {
  try {
    const { data } = await API.post('/ai/chat', { query, sessionId, type });
    if (data.status === 'success' && data.response) {
      return data.response; 
    }
    throw new Error(data.error || 'AI request failed with no error message.');
  } catch (err) {
    throw new Error(err.response?.data?.error || err.message || 'An unknown error occurred.');
  }
};

export const getQuiz = async (topic) => {
  const { data } = await API.post('/ai/quiz', { topic });
  if (data.status === 'success' && data.quiz) {
    return data.quiz;
  } else {
    throw new Error(data.error || 'Failed to retrieve quiz from server.');
  }
};

export const getRoadmap = async (goal) => {
  const { data } = await API.post('/ai/roadmap', { goal });
  if (data.status === 'success' && data.roadmap) {
    return data.roadmap;
  } else {
    throw new Error(data.error || 'Failed to retrieve roadmap from server.');
  }
};