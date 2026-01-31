import API from './api';

export const askAI = async (query) => {
  try {
    const { data } = await API.post('/ai/chat', { query });
    if (data.status === 'success' && data.response) {
      return data.response; // Return only the AI's text response
    }
    throw new Error(data.error || 'AI request failed with no error message.');
  } catch (err) {
    // Re-throw the error to be caught by the component
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