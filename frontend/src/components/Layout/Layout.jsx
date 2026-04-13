import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false); // 👈 Estado para el modal

  const handleLogoutClick = () => {
    setShowConfirmModal(true); // 👈 Mostrar confirmación
  };

  const handleLogoutConfirm = () => {
    logout();
    setShowConfirmModal(false);
    navigate('/login');
  };

  const handleLogoutCancel = () => {
    setShowConfirmModal(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const menuItems = [
    // Dashboard (ambos)
    { path: '/', icon: '📊', label: 'Dashboard', roles: ['profesor', 'coordinador'] },
    
    // Módulos para PROFESOR
   { path: '/escanear', icon: '🆔', label: 'Mi QR', roles: ['profesor'] },
    
    // Módulos para COORDINADOR
    { path: '/generar-qr', icon: '🔑', label: 'Generar QR', roles: ['coordinador'] },
    { path: '/profesores', icon: '👨‍🏫', label: 'Profesores', roles: ['coordinador'] },
    { path: '/coordinadores', icon: '👔', label: 'Coordinadores', roles: ['coordinador'] },
    { path: '/carreras', icon: '🎓', label: 'Carreras', roles: ['coordinador'] },
    { path: '/asignaturas', icon: '📚', label: 'Asignaturas', roles: ['coordinador'] },
    { path: '/horarios', icon: '⏰', label: 'Horarios', roles: ['coordinador'] },
    
    // Módulos para AMBOS
    { path: '/justificativos', icon: '📋', label: 'Justificativos', roles: ['profesor', 'coordinador'] },
    { path: '/reportes', icon: '📈', label: 'Reportes', roles: ['profesor', 'coordinador'] },
  ];

  const filteredMenu = menuItems.filter(item => 
    item.roles.some(role => user?.roles?.includes(role))
  );

  return (
    <div className="app">
      <div className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">📚</div>
          <div className="sidebar-title">IUJO Asistencia</div>
          <div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.8 }}>
            {user?.roles?.includes('coordinador') ? 'Coordinador' : 'Profesor'}
          </div>
        </div>
        <div className="sidebar-nav">
          {filteredMenu.map((item) => (
            <div
              key={item.path}
              className={`sidebar-nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              {item.icon} {item.label}
            </div>
          ))}
          <div className="sidebar-nav-item" onClick={handleLogoutClick}> {/* 👈 CAMBIADO */}
            🚪 Cerrar Sesión
          </div>
        </div>
      </div>
      <div className="main-content">
        <div className="top-header">
          <button 
            className="btn btn-primary" 
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ display: 'none' }}
          >
            ☰
          </button>
          <h2>Bienvenido, {user?.nombre} {user?.apellido}</h2>
          <div className="user-info">
            <div className="user-avatar">
              {user?.nombre?.charAt(0)}{user?.apellido?.charAt(0)}
            </div>
            <span>{user?.nombre} {user?.apellido}</span>
            <button className="logout-btn" onClick={handleLogoutClick}> {/* 👈 CAMBIADO */}
              Salir
            </button>
          </div>
        </div>
        {children}
      </div>

      {/* 👇 MODAL DE CONFIRMACIÓN */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon">⚠️</div>
            <h3 className="modal-title">Confirmar Salida</h3>
            <p className="modal-message">¿Estás seguro de que quieres cerrar sesión?</p>
            <div className="modal-buttons">
              <button className="modal-btn modal-btn-cancel" onClick={handleLogoutCancel}>
                Cancelar
              </button>
              <button className="modal-btn modal-btn-confirm" onClick={handleLogoutConfirm}>
                Sí, Salir
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
        }
        .modal-content {
          background: white;
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          min-width: 320px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          animation: modalFadeIn 0.2s ease;
        }
        .modal-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        .modal-title {
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 12px;
          color: #333;
        }
        .modal-message {
          font-size: 14px;
          color: #666;
          margin-bottom: 24px;
        }
        .modal-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        .modal-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .modal-btn-cancel {
          background: #e0e0e0;
          color: #333;
        }
        .modal-btn-cancel:hover {
          background: #ccc;
        }
        .modal-btn-confirm {
          background: #dc3545;
          color: white;
        }
        .modal-btn-confirm:hover {
          background: #c82333;
        }
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default Layout;