import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'https://quiz-system-24hy.onrender.com/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 60000  // 60s — Render free tier can take ~30-50s to cold start
});

// Request interceptor — auto-attach admin JWT if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error(`API Error ${error.response.status}:`, error.response.data);
      // Auto-logout on expired/invalid token
      if (error.response.status === 401) {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin-login';
      }
    } else if (error.request) {
      console.error('Network Error (no response):', error.message);
    } else {
      console.error('Request setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
