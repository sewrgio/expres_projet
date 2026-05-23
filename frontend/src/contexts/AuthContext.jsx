import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import InactivityModal from '../components/Layout/InactivityModal';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Helpers para manejar el storage según "Recuérdame"
const getStorageType = () => {
  return localStorage.getItem('rememberMe') === 'true' ? 'localStorage' : 'sessionStorage';
};

const getToken = () => {
  const storage = getStorageType();
  return storage === 'localStorage'
    ? localStorage.getItem('token')
    : sessionStorage.getItem('token');
};

const getUserData = () => {
  const storage = getStorageType();
  return storage === 'localStorage'
    ? localStorage.getItem('user')
    : sessionStorage.getItem('user');
};

const clearAllStorage = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('rememberMe');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
};

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutos

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const timerRef = useRef(null);
  const modalTimerRef = useRef(null);

  // --- Inactividad ---
  const resetTimer = useCallback(() => {
    if (!user) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    // No cerrar el modal si ya está visible
    if (!showInactivityModal) {
      timerRef.current = setTimeout(() => {
        setShowInactivityModal(true);
      }, INACTIVITY_TIMEOUT);
    }
  }, [user, showInactivityModal]);

  const handleInactivityLogout = useCallback(() => {
    setShowInactivityModal(false);
    clearAllStorage();
    setUser(null);
    window.location.href = '/login';
  }, []);

  // Temporizador para auto-logout de 3 minutos si el modal está visible
  useEffect(() => {
    if (showInactivityModal) {
      modalTimerRef.current = setTimeout(() => {
        console.log('⏰ Inactividad en modal excedida (3 min). Cerrando sesión automáticamente...');
        handleInactivityLogout();
      }, 3 * 60 * 1000); // 3 minutos de gracia
    }

    return () => {
      if (modalTimerRef.current) {
        clearTimeout(modalTimerRef.current);
      }
    };
  }, [showInactivityModal, handleInactivityLogout]);

  useEffect(() => {
    if (!user) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    const handler = () => resetTimer();

    events.forEach(e => window.addEventListener(e, handler));
    resetTimer(); // iniciar timer

    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user, resetTimer]);

  const handleStay = () => {
    setShowInactivityModal(false);
    resetTimer();
  };

  // --- Verificar sesión al cargar ---
  useEffect(() => {
    const verificarSesion = async () => {
      const storage = getStorageType();
      const token = getToken();
      const userData = getUserData();

      console.log('Verificando sesión - Storage type:', storage);
      console.log('Verificando sesión - Token encontrado:', !!token);
      console.log('Verificando sesión - User data encontrado:', !!userData);
      console.log('localStorage token:', localStorage.getItem('token'));
      console.log('sessionStorage token:', sessionStorage.getItem('token'));
      console.log('rememberMe flag:', localStorage.getItem('rememberMe'));

      if (token && userData) {
        try {
          const verifyRes = await api.get('/auth/verify');
          const freshUser = verifyRes.data.user;
          setUser(freshUser);
          // Actualizar storage con datos frescos
          if (storage === 'localStorage') {
            localStorage.setItem('user', JSON.stringify(freshUser));
          } else {
            sessionStorage.setItem('user', JSON.stringify(freshUser));
          }
          console.log('Sesión verificada y datos actualizados');
        } catch (err) {
          console.error('Error verificando sesión:', err);
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

  // --- Login ---
  const login = async (correo, password, rememberMe = false) => {
    const response = await api.post('/auth/login', { correo, password, platform: 'web' });
    const { token, usuario } = response.data;

    clearAllStorage();

    console.log('Login - rememberMe:', rememberMe);
    if (rememberMe) {
      localStorage.setItem('rememberMe', 'true');
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(usuario));
      console.log('Token guardado en localStorage');
    } else {
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('user', JSON.stringify(usuario));
      console.log('Token guardado en sessionStorage');
    }

    setUser(usuario);
    return usuario;
  };

  // --- Logout ---
  const logout = () => {
    clearAllStorage();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
      {showInactivityModal && (
        <InactivityModal onStay={handleStay} onLogout={handleInactivityLogout} />
      )}
    </AuthContext.Provider>
  );
};