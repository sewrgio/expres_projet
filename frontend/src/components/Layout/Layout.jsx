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

  const handleLogoutClick = () => setShowConfirmModal(true);
  const handleConfirmLogout = () => {
    setShowConfirmModal(false);
    logout();
    navigate('/login');
  };
  const handleCancelLogout = () => setShowConfirmModal(false);
  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);
  const isActive = (path) => location.pathname === path;

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
        { path: '/bitacora', icon: <IconClipboard />, label: 'Bitácora', roles: ['auditor'] },
      ]
    },
    { path: '/configuracion', icon: <IconSettings />, label: 'Configuración', roles: ['auditor'] },
  ];

  const filteredMenu = menuItems.filter(item => 
    item.roles.some(role => user?.roles?.includes(role))
  );

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-indigo-200">
      {/* Botón hamburguesa para móvil */}
      <button 
        className="lg:hidden fixed top-4 left-4 z-50 bg-[#3f51b5] text-white p-3 rounded-lg shadow-lg hover:bg-[#303f9f] transition-colors"
        onClick={toggleMenu} aria-label="Menu"
      >
        <IconMenu />
      </button>
      
      {/* Overlay para cerrar menú */}
      {menuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={closeMenu} 
        />
      )}
      
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 2xl:w-80 bg-gradient-to-b from-[#1a237e] to-[#283593] text-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 text-center border-b border-white/10 bg-black/10">
          <div className="w-16 h-16 2xl:w-20 2xl:h-20 mx-auto bg-gradient-to-br from-amber-500 to-amber-400 rounded-full flex items-center justify-center text-3xl 2xl:text-4xl shadow-[0_8px_20px_rgba(245,158,11,0.3)] mb-4">
            <IconBookOpen />
          </div>
          <h1 className="text-xl 2xl:text-2xl font-bold tracking-wide">IUJO Asistencia</h1>
          <div className="text-xs 2xl:text-sm mt-1 text-white/80 font-medium">
            {user?.roles?.includes('auditor') ? 'Auditor' : user?.roles?.includes('coordinador') ? 'Coordinador' : 'Profesor'}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar">
          {filteredMenu.map((item, index) => (
            <div key={index} className="mb-1">
              {item.dropdown ? (
                <div>
                  <button
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-sm 2xl:text-base font-medium ${openDropdown === index ? 'bg-indigo-600/50 text-white shadow-inner' : 'text-slate-300 hover:bg-white/10 hover:text-white hover:translate-x-1'}`}
                    onClick={() => setOpenDropdown(openDropdown === index ? null : index)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{item.icon}</span>
                      {item.label}
                    </div>
                    <span className="text-xs">{openDropdown === index ? '▼' : '▶'}</span>
                  </button>
                  
                  <div className={`overflow-hidden transition-all duration-300 ${openDropdown === index ? 'max-h-[500px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                    <div className="bg-black/20 rounded-lg py-2 mx-2">
                      {item.dropdown
                        .filter(subItem => subItem.roles.some(role => user?.roles?.includes(role)))
                        .map((subItem, subIndex) => (
                          <button
                            key={subIndex}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm 2xl:text-base transition-all duration-200 ${isActive(subItem.path) ? 'bg-indigo-600/40 text-white font-semibold pl-6' : 'text-slate-300 hover:bg-white/10 hover:text-white hover:pl-6'}`}
                            onClick={() => {
                              navigate(subItem.path);
                              setOpenDropdown(null);
                              closeMenu();
                            }}
                          >
                            <span>{subItem.icon}</span> {subItem.label}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm 2xl:text-base font-medium ${isActive(item.path) ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-[0_4px_15px_rgba(63,81,181,0.3)]' : 'text-slate-300 hover:bg-white/10 hover:text-white hover:translate-x-1'}`}
                  onClick={() => {
                    navigate(item.path);
                    closeMenu();
                  }}
                >
                  <span className="text-lg">{item.icon}</span> {item.label}
                </button>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300 lg:ml-72 2xl:ml-80">
        <div className="p-3 sm:p-6 lg:p-8 2xl:p-12 w-full max-w-[1920px] mx-auto">
          
          {/* Top Header */}
          <header className="bg-white/90 backdrop-blur-md border border-white shadow-sm rounded-xl sm:rounded-2xl p-3 sm:p-6 mb-4 sm:mb-8 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 sticky top-3 z-30">
            <h2 className="text-lg sm:text-2xl 2xl:text-3xl font-bold text-slate-800 tracking-tight text-center sm:text-left pl-10 lg:pl-0">
              Sistema de Control de Asistencias
            </h2>
            
            <div className="flex items-center gap-2 sm:gap-4 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
              <div className="hidden sm:flex w-10 h-10 2xl:w-12 2xl:h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white items-center justify-center font-bold text-sm shadow-md">
                IU
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-800 text-xs sm:text-base 2xl:text-lg leading-tight">
                  {user?.nombre} {user?.apellido}
                </span>
                <span className="text-[10px] sm:text-xs text-slate-500 font-medium">Conectado</span>
              </div>
              <div className="w-px h-6 sm:h-8 bg-slate-200 mx-1"></div>
              <button 
                onClick={handleLogoutClick}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 sm:p-2 rounded-lg transition-colors font-semibold text-xs sm:text-base flex items-center gap-1"
              >
                <span>Salir</span>
              </button>
            </div>
          </header>

          {/* Page Content */}
          <div className="animate-fade-in-up">
            {children}
          </div>
        </div>
      </main>

      {/* Modal Confirmación Salir */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-black/40 transition-opacity">
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md overflow-hidden animate-zoom-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 sm:p-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-500 text-3xl mx-auto mb-4">
                🚪
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-center text-slate-800 mb-2">Cerrar Sesión</h3>
              <p className="text-center text-slate-600 text-sm sm:text-base mb-8">
                ¿Estás seguro de que deseas salir del sistema?
              </p>
              
              <div className="flex gap-3 sm:gap-4 justify-center">
                <button 
                  onClick={handleCancelLogout}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors text-sm sm:text-base"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmLogout}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-red-600/30 text-sm sm:text-base"
                >
                  Sí, salir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;