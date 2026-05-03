import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import LocationAlert from '../LocationAlert/LocationAlert';

const DashboardProfesor = () => {
  console.log('=== DashboardProfesor montado ===');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [estado, setEstado] = useState({ dentro: false, asistenciasHoy: [] });
  const [stats, setStats] = useState({ totalHoy: 0, horasHoy: 0 });
  const [distancia, setDistancia] = useState(null);
  const [enArea, setEnArea] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  console.log('Estado inicial enArea:', enArea);
  console.log('lastUpdate:', lastUpdate);

  // Obtener ubicación desde el APK (almacenada en el backend)
  const obtenerUbicacionDesdeAPK = useCallback(async () => {
    try {
      const response = await api.get('/geofencing/ubicacion');
      if (response.data.success && response.data.ubicacion) {
        setDistancia(response.data.distancia);
        setEnArea(response.data.enArea);
        setLastUpdate(response.data.ubicacion.fecha_actualizacion);
        console.log('Ubicación APK:', response.data.distancia?.toFixed(3), 'km - En área:', response.data.enArea);
      } else {
        setDistancia(null);
        setEnArea(false);
        setLastUpdate(null);
      }
    } catch (error) {
      console.error('Error obteniendo ubicación desde APK:', error);
      setDistancia(null);
      setEnArea(false);
      setLastUpdate(null);
    }
  }, []);

  // Polling para obtener ubicación del APK cada 5 segundos
  useEffect(() => {
    obtenerUbicacionDesdeAPK();
    const interval = setInterval(obtenerUbicacionDesdeAPK, 5000);
    return () => clearInterval(interval);
  }, [obtenerUbicacionDesdeAPK]);

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
    const interval = setInterval(cargarEstado, 60000); // Recargar cada minuto
    return () => clearInterval(interval);
  }, [cargarEstado]);

  return (
    <div>
      <LocationAlert enArea={enArea} distancia={distancia} />
      <div className="row">
        <div className="card">
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: 'var(--primary-blue)', textAlign: 'center' }}>
            {stats.totalHoy}
          </div>
          <div style={{ textAlign: 'center' }}>Asistencias hoy</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: 'var(--primary-blue)', textAlign: 'center' }}>
            {stats.horasHoy}
          </div>
          <div style={{ textAlign: 'center' }}>Horas trabajadas hoy</div>
        </div>
      </div>
      <div className="card">
        <h3 className="card-title">Datos del Usuario</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div>
            <strong>Nombre:</strong> {user?.nombre}
          </div>
          <div>
            <strong>Apellido:</strong> {user?.apellido}
          </div>
          <div>
            <strong>Cédula:</strong> {user?.cedula || 'No disponible'}
          </div>
          <div>
            <strong>Correo:</strong> {user?.correo}
          </div>
          <div>
            <strong>Teléfono:</strong> {user?.telefono || 'No disponible'}
          </div>
          <div>
            <strong>Carrera:</strong> {user?.nombre_carrera || 'No disponible'}
          </div>
          <div>
            <strong>Rol:</strong> {user?.roles?.join(', ') || user?.rol || 'No disponible'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardProfesor;