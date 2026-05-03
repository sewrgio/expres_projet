import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  IconDashboard, IconScanQR, IconKey, IconTeachers,
  IconAddAdmin, IconUsers, IconGraduation, IconBookOpen,
  IconClock, IconClipboard, IconChart, IconMenu, IconSettings
} from '../Icons/SystemIcons';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

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

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const menuItems = [
    { path: '/', icon: <IconDashboard />, label: 'Panel Principal', roles: ['auditor', 'coordinador', 'adjunto coordinacion', 'profesor'] },
    {
      label: 'Coordinador',
      icon: <IconBookOpen />,
      roles: ['coordinador', 'adjunto coordinacion'],
      dropdown: [
        { path: '/administrar-qr', icon: <IconScanQR />, label: 'Administrar QR', roles: ['coordinador', 'adjunto coordinacion'] },
        { path: '/profesores', icon: <IconTeachers />, label: 'Profesores', roles: ['coordinador', 'adjunto coordinacion'] },
        { path: '/asignaturas', icon: <IconBookOpen />, label: 'Asignaturas y Horarios', roles: ['coordinador', 'adjunto coordinacion'] },
        { path: '/justificativos-profesores', icon: <IconClipboard />, label: 'Justificativos Profesores', roles: ['coordinador', 'adjunto coordinacion'] },
        { path: '/reportes', icon: <IconChart />, label: 'Reportes', roles: ['coordinador', 'adjunto coordinacion'] },
      ]
    },
    { path: '/escanear', icon: <IconScanQR />, label: 'Escanear QR', roles: ['coordinador', 'adjunto coordinacion', 'profesor'] },
    { path: '/justificativos', icon: <IconClipboard />, label: 'Justificativos', roles: ['profesor', 'coordinador', 'adjunto coordinacion'] },
    {
      label: 'Auditor',
      icon: <IconAddAdmin />,
      roles: ['auditor'],
      dropdown: [
        { path: '/agregar-coordinador', icon: <IconAddAdmin />, label: 'Agregar Coordinador', roles: ['auditor'] },
        { path: '/control-coordinadores', icon: <IconUsers />, label: 'Control Coordinadores', roles: ['auditor'] },
        { path: '/roles', icon: <IconKey />, label: 'Gestión de Roles', roles: ['auditor'] },
        { path: '/control-qr-fijos', icon: <IconScanQR />, label: 'Control QR Fijos', roles: ['auditor'] },
        { path: '/carreras', icon: <IconGraduation />, label: 'Carreras', roles: ['auditor'] },
        { path: '/reportes', icon: <IconChart />, label: 'Reportes', roles: ['auditor'] },
      ]
    },
    { path: '/configuracion', icon: <IconSettings />, label: 'Configuración', roles: ['auditor'] },
  ];

  const filteredMenu = menuItems.filter(item => 
    item.roles.some(role => user?.roles?.includes(role))
  );

  return (
    <div className="app">
      {/* Botón hamburguesa para móvil */}
      <button className="menu-toggle" onClick={toggleMenu} aria-label="Menu">
        <IconMenu />
      </button>
      
      {/* Overlay para cerrar menú */}
      <div className={`sidebar-overlay ${menuOpen ? 'open' : ''}`} onClick={closeMenu} />
      
      <div className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo"><IconBookOpen /></div>
          <div className="sidebar-title">IUJO Asistencia</div>
          <div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.8 }}>
            {user?.roles?.includes('auditor') ? 'Auditor' : user?.roles?.includes('coordinador') ? 'Coordinador' : 'Profesor'}
          </div>
        </div>
        <div className="sidebar-nav">
          {filteredMenu.map((item, index) => (
            <div key={index}>
              {item.dropdown ? (
                <div>
                  <div
                    className={`sidebar-nav-item ${openDropdown === index ? 'active' : ''}`}
                    onClick={() => setOpenDropdown(openDropdown === index ? null : index)}
                  >
                    {item.icon} {item.label} {openDropdown === index ? '▼' : '▶'}
                  </div>
                  {openDropdown === index && (
                    <div className="sidebar-dropdown">
                      {item.dropdown
                        .filter(subItem => subItem.roles.some(role => user?.roles?.includes(role)))
                        .map((subItem, subIndex) => (
                          <div
                            key={subIndex}
                            className={`sidebar-dropdown-item ${isActive(subItem.path) ? 'active' : ''}`}
                            onClick={() => {
                              navigate(subItem.path);
                              setOpenDropdown(null);
                              closeMenu();
                            }}
                          >
                            {subItem.icon} {subItem.label}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`sidebar-nav-item ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => {
                    navigate(item.path);
                    closeMenu();
                  }}
                >
                  {item.icon} {item.label}
                </div>
              )}
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon">🚪</div>
              <div>
                <h3>Cerrar Sesión</h3>
                <p>¿Estás seguro de que deseas cerrar sesión?</p>
              </div>
            </div>
            <div className="modal-buttons">
              <button className="btn btn-secondary" onClick={handleCancelLogout}>
                No
              </button>
              <button className="btn btn-primary" onClick={handleConfirmLogout}>
                Sí
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;