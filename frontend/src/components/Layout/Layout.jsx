import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  IconDashboard, IconScanQR, IconKey, IconTeachers,
  IconAddAdmin, IconUsers, IconGraduation, IconBookOpen,
  IconClock, IconClipboard, IconChart, IconMenu
} from '../Icons/SystemIcons';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleLogoutClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmLogout = () => {
    setShowConfirmModal(false);
    logout();
    navigate('/login');
  };

  const handleCancelLogout = () => {
    setShowConfirmModal(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const menuItems = [
    { path: '/', icon: <IconDashboard />, label: 'Panel Principal', roles: ['auditor', 'coordinador', 'profesor'] },
    { path: '/escanear', icon: <IconScanQR />, label: 'Escanear QR', roles: ['coordinador', 'profesor'] },
    { path: '/generar-qr', icon: <IconKey />, label: 'Generar QR', roles: ['coordinador'] },
    { path: '/profesores', icon: <IconTeachers />, label: 'Profesores', roles: ['coordinador'] },
    { path: '/agregar-coordinador', icon: <IconAddAdmin />, label: 'Agregar Coordinador', roles: ['auditor'] },
    { path: '/control-coordinadores', icon: <IconUsers />, label: 'Control Coordinadores', roles: ['auditor'] },
    { path: '/carreras', icon: <IconGraduation />, label: 'Carreras', roles: ['auditor'] },
    { path: '/asignaturas', icon: <IconBookOpen />, label: 'Asignaturas', roles: ['coordinador'] },
    { path: '/horarios', icon: <IconClock />, label: 'Horarios', roles: ['coordinador'] },
    { path: '/justificativos', icon: <IconClipboard />, label: 'Justificativos', roles: ['profesor', 'coordinador', 'auditor'] },
    { path: '/reportes', icon: <IconChart />, label: 'Reportes', roles: ['auditor', 'coordinador'] },
  ];

  const filteredMenu = menuItems.filter(item => 
    item.roles.some(role => user?.roles?.includes(role))
  );

  return (
    <div className="app">
      <div className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo"><IconBookOpen /></div>
          <div className="sidebar-title">IUJO Asistencia</div>
          <div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.8 }}>
            {user?.roles?.includes('auditor') ? 'Auditor' : user?.roles?.includes('coordinador') ? 'Coordinador' : 'Profesor'}
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
        </div>
      </div>
      <div className="main-content">
        <div className="top-header">
          <h2>IUJO - Sistema de Control de Asistencias</h2>
          <div className="user-info">
            <div className="user-avatar">
              IUJO
            </div>
            <span>{user?.nombre} {user?.apellido}</span>
            <button className="logout-btn" onClick={handleLogoutClick}>
              Salir
            </button>
          </div>
        </div>
        {children}
      </div>

      {/* Modal de confirmación */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={handleCancelLogout}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Cerrar Sesión</h3>
            <p className="modal-message">¿Estás seguro de que deseas cerrar sesión?</p>
            <div className="modal-buttons">
              <button className="modal-btn modal-btn-cancel" onClick={handleCancelLogout}>
                Cancelar
              </button>
              <button className="modal-btn modal-btn-confirm" onClick={handleConfirmLogout}>
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;