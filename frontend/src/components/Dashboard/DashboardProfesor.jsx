import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

const DashboardProfesor = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [estado, setEstado] = useState({ dentro: false, asistenciasHoy: [] });
  const [stats, setStats] = useState({ totalHoy: 0, horasHoy: 0 });

  const calcularHoras = useCallback((asistencias) => {
    if (!asistencias) return '0.0';
    let total = 0;
    asistencias.forEach(asis => {
      if (asis.fecha_salida) {
        const entrada = new Date(asis.fecha_entrada);
        const salida = new Date(asis.fecha_salida);
        total += (salida - entrada) / (1000 * 60 * 60);
      }
    });
    return total.toFixed(1);
  }, []);

  const cargarEstado = useCallback(async () => {
    try {
      const response = await api.get('/asistencias/estado');
      setEstado(response.data);
      setStats({
        totalHoy: response.data.asistenciasHoy?.length || 0,
        horasHoy: calcularHoras(response.data.asistenciasHoy)
      });
    } catch (error) {
      if (error.response?.status !== 403) {
        console.error('Error cargando estado:', error);
      }
    }
  }, [calcularHoras]);

  useEffect(() => {
    cargarEstado();
  }, [cargarEstado]);



  return (
    <div>
      <div className="row">
        <div className="card">
          <div style={{ fontSize: '48px', textAlign: 'center' }}>
            {estado.dentro ? '✅' : '⭕'}
          </div>
          <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold', marginTop: '10px' }}>
            {estado.dentro ? 'Actualmente DENTRO' : 'Actualmente FUERA'}
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: 'var(--iujo-blue)', textAlign: 'center' }}>
            {stats.totalHoy}
          </div>
          <div style={{ textAlign: 'center' }}>Asistencias hoy</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: 'var(--iujo-blue)', textAlign: 'center' }}>
            {stats.horasHoy}
          </div>
          <div style={{ textAlign: 'center' }}>Horas trabajadas hoy</div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Acciones Rápidas</h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => navigate('/escanear')}>
            🆔 Ver Mi QR
          </button>
          <button className="btn btn-success" onClick={() => navigate('/reportes')}>
            📊 Ver Reportes
          </button>
        </div>
      </div>

      {estado.asistenciasHoy?.length > 0 && (
        <div className="card">
          <h3 className="card-title">Asistencias de Hoy</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Entrada</th><th>Salida</th><th>Ubicación</th></tr>
              </thead>
              <tbody>
                {estado.asistenciasHoy.map(asis => (
                  <tr key={asis.id_asistencia}>
                    <td>{new Date(asis.fecha_entrada).toLocaleTimeString()}</td>
                    <td>{asis.fecha_salida ? new Date(asis.fecha_salida).toLocaleTimeString() : '--'}</td>
                    <td>{asis.ubicacion || 'Coordinación'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardProfesor;