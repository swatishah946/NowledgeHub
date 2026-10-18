import API from './api';

export const registerUser = (data) => API.post('/auth/register', data);
export const verifyUserOtp = (data) => API.post('/auth/verify', data);
export const resendOtp = (email) => API.post('/auth/resend-otp', { email });
export const loginUser = (data) => API.post('/auth/login', data);

// Returns { user: { _id, name, email } }
export const getUserProfile = () => API.get('/auth/me');
