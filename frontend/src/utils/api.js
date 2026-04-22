import axios from 'axios';

const resolveApiBase = () => {
  const envBase = process.env.REACT_APP_API_BASE?.trim();
  if (envBase) return envBase;

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }

    if (port && port !== '80' && port !== '443') {
      return `${protocol}//${hostname}:5000/api`;
    }

    // For Vercel/public hosting, prefer same-origin `/api` (proxied by `vercel.json`).
    return '/api';
  }

  return 'http://localhost:5000/api';
};

const API_BASE = resolveApiBase();
const REQUEST_TIMEOUT_MS = 30000;

const getTokenSafely = () => {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
};

const clearAuthSafely = () => {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } catch {
    // Ignore storage access errors in restricted browser contexts.
  }
};

const api = axios.create({
  baseURL: API_BASE,
  timeout: REQUEST_TIMEOUT_MS,
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
  if (isFormData && config.headers) {
    // Let the browser set `multipart/form-data; boundary=...`
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type');
      config.headers.delete('content-type');
    } else {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }
  }

  const token = getTokenSafely();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Handle responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthSafely();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  deleteAccount: (data) => api.delete('/auth/me', { data })
};

// Posts
export const postsAPI = {
  getAll: (params) => api.get('/posts', { params }),
  getById: (id) => api.get(`/posts/${id}`),
  getMyPosts: () => api.get('/posts/my-posts'),
  create: (data) => api.post('/posts', data),
  update: (id, data) => api.put(`/posts/${id}`, data),
  delete: (id) => api.delete(`/posts/${id}`),
  like: (id) => api.post(`/posts/${id}/like`),
  uploadImage: (formData) => api.post('/posts/upload-image', formData, {
    timeout: 60000
  })
};

// Comments
export const commentsAPI = {
  getByPost: (postId) => api.get(`/comments/post/${postId}`),
  create: (data) => api.post('/comments', data),
  update: (id, data) => api.put(`/comments/${id}`, data),
  delete: (id) => api.delete(`/comments/${id}`),
  like: (id) => api.post(`/comments/${id}/like`)
};

// Users
export const usersAPI = {
  getProfile: (username) => api.get(`/users/${username}`)
};

export default api;
