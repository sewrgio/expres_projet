import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Helpers para manejar el storage según "Recuérdame"
const getStorage = () => {
  return localStorage.getItem('rememberMe') === 'true' ? localStorage : sessionStorage;
};

const getToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

const getUserData = () => {
  return localStorage.getItem('user') || sessionStorage.getItem('user');
};

const clearAllStorage = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('rememberMe');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verificarSesion = async () => {
      const token = getToken();
      const userData = getUserData();

      if (token && userData) {
        try {
          await api.get('/auth/verify');
          setUser(JSON.parse(userData));
        } catch {
          clearAllStorage();
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    };

    verificarSesion();
  }, []);

  const login = async (correo, password, rememberMe = false) => {
    const response = await api.post('/auth/login', { correo, password });
    const { token, usuario } = response.data;

    // Limpiar ambos storages primero
    clearAllStorage();

    if (rememberMe) {
      localStorage.setItem('rememberMe', 'true');
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(usuario));
    } else {
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('user', JSON.stringify(usuario));
    }

    setUser(usuario);
    return usuario;
  };

  const logout = () => {
    clearAllStorage();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};