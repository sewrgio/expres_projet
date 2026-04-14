import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import GenerarQR from '../QR/GenerarQR';
import ListaProfesores from '../Profesores/ListaProfesores';
import GestionCoordinadores from '../Coordinadores/GestionCoordinadores';
import GestionCarreras from '../Carreras/GestionCarreras';
import GestionAsignaturas from '../Asignaturas/GestionAsignaturas';
import GestionHorarios from '../Horarios/GestionHorarios';
import GestionJustificativos from '../Justificativos/GestionJustificativos';
import GestionInasistencias from '../Inasistencias/GestionInasistencias';
import ReporteAsistencia from '../Reportes/ReporteAsistencia';

const DashboardCoordinador = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    totalProfesores: 0,
    totalCarreras: 0,
    asistenciasHoy: 0
  });

  useEffect(() => {
    cargarStats();
  }, []);

  const cargarStats = async () => {
    try {
      const [profesores, carreras, asistencias] = await Promise.all([
        api.get('/profesores'),
        api.get('/carreras'),
        api.get('/asistencias')
      ]);
      setStats({
        totalProfesores: profesores.data.length,
        totalCarreras: carreras.data.length,
        asistenciasHoy: asistencias.data?.length || 0
      });
    } catch (error) {
      console.error('Error cargando stats:', error);
    }
  };

  const tabs = [
    { id: 'dashboard', nombre: 'Dashboard', icon: '📊' },
    { id: 'qr', nombre: 'Generar QR', icon: '🔑' },
    { id: 'profesores', nombre: 'Profesores', icon: '👨‍🏫' },
    { id: 'coordinadores', nombre: 'Coordinadores', icon: '👔' },
    { id: 'carreras', nombre: 'Carreras', icon: '🎓' },
    { id: 'asignaturas', nombre: 'Asignaturas', icon: '📚' },
    { id: 'horarios', nombre: 'Horarios', icon: '⏰' },
    { id: 'justificativos', nombre: 'Justificativos', icon: '📋' },
    { id: 'inasistencias', nombre: 'Inasistencias', icon: '⚠️' },
    { id: 'reportes', nombre: 'Reportes', icon: '📈' },
  ];

  const renderDashboard = () => (
    <>
      <div className="row">
        <div className="card">
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: 'var(--iujo-blue)', textAlign: 'center' }}>
            {stats.totalProfesores}
          </div>
          <div style={{ textAlign: 'center' }}>Profesores Activos</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: 'var(--iujo-blue)', textAlign: 'center' }}>
            {stats.totalCarreras}
          </div>
          <div style={{ textAlign: 'center' }}>Carreras</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: 'var(--iujo-blue)', textAlign: 'center' }}>
            {stats.asistenciasHoy}
          </div>
          <div style={{ textAlign: 'center' }}>Asistencias Hoy</div>
        </div>
      </div>

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
          <h3 style={{ textAlign: 'center', margin: '10px 0', color: '#003366' }}>Coordinadores</h3>
          <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>Gestionar coordinadores</p>
        </div>
      </div>

      <div className="row">
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
      </div>

      <div className="row">
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('justificativos')}>
          <div style={{ fontSize: '40px', textAlign: 'center' }}>📋</div>
          <h3 style={{ textAlign: 'center', margin: '10px 0', color: '#003366' }}>Justificativos</h3>
          <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>Revisar justificativos</p>
        </div>
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('inasistencias')}>
          <div style={{ fontSize: '40px', textAlign: 'center' }}>⚠️</div>
          <h3 style={{ textAlign: 'center', margin: '10px 0', color: '#003366' }}>Inasistencias</h3>
          <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>Ver reportes de inasistencias</p>
        </div>
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('reportes')}>
          <div style={{ fontSize: '40px', textAlign: 'center' }}>📈</div>
          <h3 style={{ textAlign: 'center', margin: '10px 0', color: '#003366' }}>Reportes</h3>
          <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>Ver reportes de asistencia</p>
        </div>
      </div>
    </>
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
        {activeTab === 'coordinadores' && <GestionCoordinadores />}
        {activeTab === 'carreras' && <GestionCarreras />}
        {activeTab === 'asignaturas' && <GestionAsignaturas />}
        {activeTab === 'horarios' && <GestionHorarios />}
        {activeTab === 'justificativos' && <GestionJustificativos />}
        {activeTab === 'inasistencias' && <GestionInasistencias />}
        {activeTab === 'reportes' && <ReporteAsistencia />}
      </div>
    </div>
  );
};

export default DashboardCoordinador;