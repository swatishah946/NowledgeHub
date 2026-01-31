import API from './api';

export const createChatRoom = async (name) => {
    const { data } = await API.post('/chat/create', { name });
    return data;
};

export const joinChatRoom = async (code) => {
    const { data } = await API.post('/chat/join', { code });
    return data;
};

export const getRecentMessages = async (roomId) => {
    const { data } = await API.get(`/chat/recent/${roomId}`);
    return data;
};