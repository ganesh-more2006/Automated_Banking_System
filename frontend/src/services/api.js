import axios from 'axios';

// Create configured Axios instance
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000, // 5 seconds timeout
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Standardize error handling foundation
    const message = error.response?.data?.message || error.message || 'An unexpected error occurred';
    const detail = error.response?.data?.detail || 'Request Error';
    console.error(`API Error [${error.config?.url}]:`, { message, detail, status: error.response?.status });
    
    return Promise.reject({
      message,
      detail,
      status: error.response?.status,
      originalError: error
    });
  }
);

export const getHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;
