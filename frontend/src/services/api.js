import axios from 'axios';
import { BASE_URL } from '../config';
import { removeToken, getToken } from '../utils/authUtils';
import { toast } from 'react-hot-toast';

const API = axios.create({
  baseURL: `${BASE_URL.replace(/\/+$/, '')}/api`,
  timeout: 2 * 60 * 1000,
});

API.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 = missing/expired token: log out once and send the user to /login.
// (403 is used for "verify your email" and "not a room member", which must not log you out.)
let redirecting = false;
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isAuthRequest = /\/auth\/(login|register|verify|resend-otp)/.test(error.config?.url || '');

    if (status === 401 && !isAuthRequest && !redirecting) {
      redirecting = true;
      removeToken();
      toast.error('Your session has expired. Please log in again.');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API;
