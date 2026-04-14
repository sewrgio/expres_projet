import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const menuItems = [
    { path: '/', icon: '📊', label: 'Dashboard', roles: ['coordinador', 'profesor'] },
    { path: '/escanear', icon: '📷', label: 'Escanear QR', roles: ['profesor'] },
    { path: '/generar-qr', icon: '🔑', label: 'Generar QR', roles: ['coordinador'] },
    { path: '/profesores', icon: '👨‍🏫', label: 'Profesores', roles: ['coordinador'] },
    { path: '/agregar-coordinador', icon: '👔', label: 'Agregar Coordinador', roles: ['coordinador'] },
    { path: '/carreras', icon: '🎓', label: 'Carreras', roles: ['coordinador'] },
    { path: '/asignaturas', icon: '📚', label: 'Asignaturas', roles: ['coordinador'] },
    { path: '/horarios', icon: '⏰', label: 'Horarios', roles: ['coordinador'] },
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
        </div>
      </div>
      <div className="main-content">
        <div className="top-header">
          <h2>IUJO - Sistema de Control de Asistencias</h2>
          <div className="user-info">
            <div className="user-avatar">
              {user?.nombre?.charAt(0)}{user?.apellido?.charAt(0)}
            </div>
            <span>{user?.nombre} {user?.apellido}</span>
            <button className="logout-btn" onClick={handleLogout}>
              Salir
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Layout;