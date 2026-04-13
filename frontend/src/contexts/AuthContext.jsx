import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verificarSesion = async () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      console.log('🔍 Verificando sesión...');
      console.log('Token existe:', !!token);
      console.log('UserData existe:', !!userData);
      
      if (token && userData) {
        try {
          // El interceptor de api.js ya agrega el token automáticamente
          const response = await api.get('/auth/verify');
          console.log('✅ Token válido:', response.data);
          setUser(JSON.parse(userData));
        } catch (error) {
          console.error('❌ Token inválido:', error.response?.status);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      } else {
        console.log('⚠️ No hay token o userData');
        setUser(null);
      }
      setLoading(false);
    };

    verificarSesion();
  }, []);

  const login = async (correo, password) => {
    const response = await api.post('/auth/login', { correo, password });
    const { token, usuario } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(usuario));
    setUser(usuario);
    return usuario;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};