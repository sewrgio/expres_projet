import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import LocationAlert from '../LocationAlert/LocationAlert';

const DashboardProfesor = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [estado, setEstado] = useState({ dentro: false, asistenciasHoy: [] });
  const [stats, setStats] = useState({ totalHoy: 0, horasHoy: 0 });
  const [distancia, setDistancia] = useState(null);
  const [enArea, setEnArea] = useState(false);

  const IUJO_COORDS = { lat: 10.510717, lon: -66.936949 };

  const calcularDistancia = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const monitorearUbicacion = useCallback(() => {
    if (!navigator.geolocation) {
      console.error('Geolocalización no soportada');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const d = calcularDistancia(
          pos.coords.latitude, 
          pos.coords.longitude, 
          IUJO_COORDS.lat, 
          IUJO_COORDS.lon
        );
        setDistancia(d);
        setEnArea(d <= 1.0); // 1km flexible
      },
      (err) => console.error('Error de geolocalización:', err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

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
    const cleanGeolocation = monitorearUbicacion();
    return () => cleanGeolocation && cleanGeolocation();
  }, [cargarEstado, monitorearUbicacion]);

  return (
    <div>
      <LocationAlert enArea={enArea} distancia={distancia} />
      <div className="row">
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
          {enArea && (
            <button 
              className="btn btn-primary" 
              onClick={() => navigate('/escanear')}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              🆔 Ver Mi QR
            </button>
          )}
          <button className="btn btn-success" onClick={() => navigate('/justificativos')}>
            📋 Justificativos
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