import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import GenerarQR from '../QR/GenerarQR';
import ListaProfesores from '../Profesores/ListaProfesores';
import AgregarCoordinador from '../Coordinadores/AgregarCoordinador';
import GestionCarreras from '../Carreras/GestionCarreras';
import GestionAsignaturas from '../Asignaturas/GestionAsignaturas';
import GestionHorarios from '../Horarios/GestionHorarios';
import GestionJustificativos from '../Justificativos/GestionJustificativos';
import ReporteAsistencia from '../Reportes/ReporteAsistencia';

const DashboardCoordinador = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', nombre: 'Dashboard', icon: '📊', roles: ['auditor', 'coordinador'] },
    { id: 'qr', nombre: 'Generar QR', icon: '🔑', roles: ['coordinador'] },
    { id: 'profesores', nombre: 'Profesores', icon: '👨‍🏫', roles: ['coordinador'] },
    { id: 'coordinadores', nombre: 'Agregar Coordinador', icon: '👔', roles: ['auditor'] },
    { id: 'carreras', nombre: 'Carreras', icon: '🎓', roles: ['auditor'] },
    { id: 'asignaturas', nombre: 'Asignaturas', icon: '📚', roles: ['coordinador'] },
    { id: 'horarios', nombre: 'Horarios', icon: '⏰', roles: ['coordinador'] },
    { id: 'justificativos', nombre: 'Justificativos', icon: '📋', roles: ['coordinador'] },
    { id: 'control-coordinadores', nombre: 'Control Coordinadores', icon: '👥', roles: ['auditor'] },
    { id: 'reportes', nombre: 'Reportes', icon: '📈', roles: ['auditor', 'coordinador'] },
  ];

  const filteredTabs = tabs.filter(tab => tab.roles.some(r => user?.roles?.includes(r)));

  const renderDashboard = () => (
    <div className="row">
      {filteredTabs.filter(tab => tab.id !== 'dashboard').map(tab => (
        <div 
          key={tab.id} 
          className="card" 
          style={{ cursor: 'pointer' }} 
          onClick={() => setActiveTab(tab.id)}
        >
          <div style={{ fontSize: '40px', textAlign: 'center' }}>{tab.icon}</div>
          <h3 style={{ textAlign: 'center', margin: '10px 0', color: '#003366' }}>{tab.nombre}</h3>
          <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>
            {tab.id === 'qr' ? 'Crea códigos QR para las coordinaciones' :
             tab.id === 'profesores' ? 'Gestionar profesores y horarios' :
             tab.id === 'coordinadores' ? 'Registrar nuevos coordinadores' :
             tab.id === 'carreras' ? 'Administrar carreras' :
             tab.id === 'asignaturas' ? 'Gestionar asignaturas' :
             tab.id === 'horarios' ? 'Gestionar horarios' :
             tab.id === 'justificativos' ? 'Revisar justificativos' :
             tab.id === 'control-coordinadores' ? 'Control y justificativos de coordinadores' :
             tab.id === 'reportes' ? 'Ver reportes de asistencia' : ''}
          </p>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div className="top-header">
        <h2>Panel de Coordinación</h2>
        <div className="user-info">
          <div className="user-avatar">
            {user?.nombre?.charAt(0)}{user?.apellido?.charAt(0)}
          </div>
          <span>{user?.nombre} {user?.apellido}</span>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--iujo-dark-gray)', flexWrap: 'wrap' }}>
          {filteredTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 24px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                borderBottom: activeTab === tab.id ? '3px solid var(--iujo-gold)' : 'none',
                color: activeTab === tab.id ? 'var(--iujo-blue)' : '#666'
              }}
            >
              {tab.icon} {tab.nombre}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'qr' && <GenerarQR />}
        {activeTab === 'profesores' && <ListaProfesores />}
        {activeTab === 'coordinadores' && <AgregarCoordinador />}
        {activeTab === 'carreras' && <GestionCarreras />}
        {activeTab === 'asignaturas' && <GestionAsignaturas />}
        {activeTab === 'horarios' && <GestionHorarios />}
        {activeTab === 'justificativos' && <GestionJustificativos />}
        {activeTab === 'control-coordinadores' && <GestionJustificativos />}
        {activeTab === 'reportes' && <ReporteAsistencia />}
      </div>
    </div>
  );
};

export default DashboardCoordinador;