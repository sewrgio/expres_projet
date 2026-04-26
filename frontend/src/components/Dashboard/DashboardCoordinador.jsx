import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  IconDashboard, IconKey, IconTeachers, IconAddAdmin,
  IconGraduation, IconBookOpen, IconClock, IconClipboard,
  IconUsers, IconChart, IconScanQR
} from '../Icons/SystemIcons';
import LocationAlert from '../LocationAlert/LocationAlert';
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
  const [estado, setEstado] = useState({ dentro: false, asistenciasHoy: [] });
  const [stats, setStats] = useState({ totalHoy: 0, horasHoy: 0 });
  const [distancia, setDistancia] = useState(null);
  const [enArea, setEnArea] = useState(false);

  const IUJO_COORDS = { lat: 10.510717, lon: -66.936949 };

  const calcularDistancia = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
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
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const d = calcularDistancia(pos.coords.latitude, pos.coords.longitude, IUJO_COORDS.lat, IUJO_COORDS.lon);
        setDistancia(d);
        setEnArea(d <= 1.0);
      },
      (err) => console.error(err),
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
      if (error.response?.status !== 403) console.error(error);
    }
  }, [calcularHoras]);

  useEffect(() => {
    cargarEstado();
    const cleanGeo = monitorearUbicacion();
    return () => cleanGeo && cleanGeo();
  }, [cargarEstado, monitorearUbicacion]);

  const tabs = [
    { id: 'dashboard', nombre: 'Panel Principal', icon: <IconDashboard />, roles: ['auditor', 'coordinador'] },
    { id: 'qr', nombre: 'Generar QR', icon: <IconKey />, roles: ['coordinador'] },
    { id: 'profesores', nombre: 'Profesores', icon: <IconTeachers />, roles: ['coordinador'] },
    { id: 'coordinadores', nombre: 'Agregar Coordinador', icon: <IconAddAdmin />, roles: ['auditor'] },
    { id: 'carreras', nombre: 'Carreras', icon: <IconGraduation />, roles: ['auditor'] },
    { id: 'asignaturas', nombre: 'Asignaturas', icon: <IconBookOpen />, roles: ['coordinador'] },
    { id: 'horarios', nombre: 'Horarios', icon: <IconClock />, roles: ['coordinador'] },
    { id: 'justificativos', nombre: 'Justificativos', icon: <IconClipboard />, roles: ['coordinador', 'auditor'] },
    { id: 'control-coordinadores', nombre: 'Control Coordinadores', icon: <IconUsers />, roles: ['auditor'] },
    { id: 'reportes', nombre: 'Reportes', icon: <IconChart />, roles: ['auditor', 'coordinador'] },
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

      <LocationAlert enArea={enArea} distancia={distancia} />
      <div className="row" style={{ marginBottom: '20px' }}>
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