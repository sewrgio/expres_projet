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
  console.log('Estado inicial enArea:', enArea);

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
    console.log('Iniciando monitoreo de ubicación...');

    if (!navigator.geolocation) {
      console.error('Geolocalización no soportada por el navegador');
      return;
    }

    console.log('Geolocalización soportada, iniciando watchPosition...');

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        console.log('Posición obtenida:', pos);
        const d = calcularDistancia(
          pos.coords.latitude,
          pos.coords.longitude,
          IUJO_COORDS.lat,
          IUJO_COORDS.lon
        );
        setDistancia(d);
        const enArea = d <= 1.0; // 1km flexible
        setEnArea(enArea);
        console.log('Distancia al IUJO:', d.toFixed(2), 'km - En área:', enArea);
        console.log('Tu posición:', pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.error('Error de geolocalización:', err);
        console.error('Código de error:', err.code);
        console.error('Mensaje de error:', err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    console.log('watchPosition iniciado con ID:', watchId);

    return () => {
      console.log('Limpiando watchPosition con ID:', watchId);
      navigator.geolocation.clearWatch(watchId);
    };
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