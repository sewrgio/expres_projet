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
    { id: 'dashboard', nombre: 'Dashboard', icon: '📊' },
    { id: 'qr', nombre: 'Generar QR', icon: '🔑' },
    { id: 'profesores', nombre: 'Profesores', icon: '👨‍🏫' },
    { id: 'coordinadores', nombre: 'Agregar Coordinador', icon: '👔' },
    { id: 'carreras', nombre: 'Carreras', icon: '🎓' },
    { id: 'asignaturas', nombre: 'Asignaturas', icon: '📚' },
    { id: 'horarios', nombre: 'Horarios', icon: '⏰' },
    { id: 'justificativos', nombre: 'Justificativos', icon: '📋' },
    { id: 'reportes', nombre: 'Reportes', icon: '📈' },
  ];

  const renderDashboard = () => (
    <div className="row">
      <div className="card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('qr')}>
        <div style={{ fontSize: '40px', textAlign: 'center' }}>🔑</div>
        <h3 style={{ textAlign: 'center', margin: '10px 0', color: '#003366' }}>Generar QR</h3>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>Crea códigos QR para las coordinaciones</p>
      </div>
      <div className="card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('profesores')}>
        <div style={{ fontSize: '40px', textAlign: 'center' }}>👨‍🏫</div>
        <h3 style={{ textAlign: 'center', margin: '10px 0', color: '#003366' }}>Profesores</h3>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>Gestionar profesores y horarios</p>
      </div>
      <div className="card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('coordinadores')}>
        <div style={{ fontSize: '40px', textAlign: 'center' }}>👔</div>
        <h3 style={{ textAlign: 'center', margin: '10px 0', color: '#003366' }}>Agregar Coordinador</h3>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>Registrar nuevos coordinadores</p>
      </div>
      <div className="card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('carreras')}>
        <div style={{ fontSize: '40px', textAlign: 'center' }}>🎓</div>
        <h3 style={{ textAlign: 'center', margin: '10px 0', color: '#003366' }}>Carreras</h3>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>Administrar carreras</p>
      </div>
      <div className="card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('asignaturas')}>
        <div style={{ fontSize: '40px', textAlign: 'center' }}>📚</div>
        <h3 style={{ textAlign: 'center', margin: '10px 0', color: '#003366' }}>Asignaturas</h3>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>Gestionar asignaturas</p>
      </div>
      <div className="card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('horarios')}>
        <div style={{ fontSize: '40px', textAlign: 'center' }}>⏰</div>
        <h3 style={{ textAlign: 'center', margin: '10px 0', color: '#003366' }}>Horarios</h3>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>Gestionar horarios</p>
      </div>
      <div className="card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('justificativos')}>
        <div style={{ fontSize: '40px', textAlign: 'center' }}>📋</div>
        <h3 style={{ textAlign: 'center', margin: '10px 0', color: '#003366' }}>Justificativos</h3>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>Revisar justificativos</p>
      </div>
      <div className="card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('reportes')}>
        <div style={{ fontSize: '40px', textAlign: 'center' }}>📈</div>
        <h3 style={{ textAlign: 'center', margin: '10px 0', color: '#003366' }}>Reportes</h3>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>Ver reportes de asistencia</p>
      </div>
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
          {tabs.map(tab => (
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
        {activeTab === 'reportes' && <ReporteAsistencia />}
      </div>
    </div>
  );
};

export default DashboardCoordinador;