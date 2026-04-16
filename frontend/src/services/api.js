// frontend/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Interceptor con log para depurar
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('Interceptor ejecutado - Token existe:', !!token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Header Authorization agregado');
    } else {
      console.log('No hay token');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;