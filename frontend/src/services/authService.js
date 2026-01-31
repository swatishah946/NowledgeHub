import API from './api';

export const registerUser = (data) => API.post('/auth/register', data);
export const verifyUserOtp = (data) => API.post('/auth/verify', data);
export const loginUser = (data) => API.post('/auth/login', data);

// --- START: New Feature ---
// Fetches the profile of the currently logged-in user
export const getUserProfile = () => API.get('/auth/me');
// --- END: New Feature ---