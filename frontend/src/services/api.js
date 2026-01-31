import axios from 'axios';
import { BASE_URL } from '../config';
import { removeToken } from '../utils/authUtils';
import { toast } from 'react-hot-toast';

const API = axios.create({
  baseURL: BASE_URL
});

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.url = `/api${config.url}`; 
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      config.url = `/api${config.url}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle expired tokens and automatic logout
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMessage = error.response?.data?.message || '';

    // --- START: This is the fix ---
    // Check if the error is due to an expired token, but IGNORE the specific "unverified email" error.
    // This allows the login form to handle the verification message exclusively.
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      if (!errorMessage.includes("Please verify your email first")) {
        removeToken();
        toast.error("Your session has expired. Please log in again.");
        window.location.href = '/login'; 
      }
    }
    // --- END: This is the fix ---
    
    return Promise.reject(error);
  }
);

export default API;