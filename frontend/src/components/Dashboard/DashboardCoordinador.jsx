import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

const DashboardCoordinador = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
        // ✅ CAMBIADO: /asistencias → /asistencias/todas
        api.get('/asistencias/todas').catch(err => {
          if (err.response?.status === 403 || err.response?.status === 404) {
            console.log('No se pudieron cargar asistencias');
            return { data: [] };
          }
          throw err;
        })
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

  const menuCards = [
    { title: 'Generar QR', icon: '🔑', description: 'Crea códigos QR para las coordinaciones', path: '/generar-qr', color: '#003366' },
    { title: 'Profesores', icon: '👨‍🏫', description: 'Gestionar profesores y horarios', path: '/profesores', color: '#28a745' },
    { title: 'Carreras', icon: '🎓', description: 'Administrar carreras', path: '/carreras', color: '#17a2b8' },
    { title: 'Asignaturas', icon: '📚', description: 'Gestionar asignaturas', path: '/asignaturas', color: '#6610f2' },
    { title: 'Horarios', icon: '⏰', description: 'Gestionar horarios', path: '/horarios', color: '#fd7e14' },
    { title: 'Justificativos', icon: '📋', description: 'Revisar justificativos', path: '/justificativos', color: '#6f42c1' },
    { title: 'Reportes', icon: '📈', description: 'Ver reportes de asistencia', path: '/reportes', color: '#ffc107' },
  ];

  return (
    <div>
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
        {menuCards.map((card) => (
          <div key={card.path} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(card.path)}>
            <div style={{ fontSize: '40px', textAlign: 'center' }}>{card.icon}</div>
            <h3 style={{ textAlign: 'center', margin: '10px 0', color: card.color }}>{card.title}</h3>
            <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>{card.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardCoordinador;