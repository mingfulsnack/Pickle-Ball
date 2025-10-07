import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance for authenticated requests
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create axios instance for public requests (no auth required)
const publicApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  },
});

// Request interceptor to add auth token (only for authenticated API)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Request interceptor for public API to prevent caching
publicApi.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching
    const timestamp = Date.now();
    if (config.params) {
      config.params._t = timestamp;
    } else {
      config.params = { _t: timestamp };
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors (only for authenticated API)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Only log 401 errors, don't clear localStorage here to avoid conflicts
    if (error.response?.status === 401) {
      console.log('401 Unauthorized - token may be expired');
    }
    // For other errors (like 429 rate limit), just reject without redirect
    return Promise.reject(error);
  }
);

// Response interceptor for public API
publicApi.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 304 specifically for public API
    if (error.response?.status === 304) {
      console.warn('304 Not Modified received, forcing fresh request');
      // Return empty data to trigger re-fetch
      return Promise.reject(new Error('Cache hit, need fresh data'));
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
};

// Public API exports
export { publicApi };

// API


export default api;
