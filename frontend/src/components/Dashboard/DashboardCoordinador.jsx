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

  // ✅ NUEVO: Obtener ubicación desde APK (endpoint backend)
  const obtenerUbicacionDesdeAPK = useCallback(async () => {
    try {
      const response = await api.get('/geofencing/ubicacion');
      if (response.data.success && response.data.ubicacion) {
        setDistancia(response.data.distancia);
        setEnArea(response.data.enArea);
      } else {
        setDistancia(null);
        setEnArea(false);
      }
    } catch (error) {
      console.error('Error obteniendo ubicación desde APK:', error);
      setDistancia(null);
      setEnArea(false);
    }
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
    obtenerUbicacionDesdeAPK();
    
    // Actualizar ubicación cada 30 segundos desde APK
    const ubicacionInterval = setInterval(() => {
      obtenerUbicacionDesdeAPK();
    }, 30000);
    
    // Actualizar estadísticas cada 60 segundos
    const estadoInterval = setInterval(() => {
      cargarEstado();
    }, 60000);
    
    return () => {
      clearInterval(ubicacionInterval);
      clearInterval(estadoInterval);
    };
  }, [cargarEstado, obtenerUbicacionDesdeAPK]);

  const tabs = [
    { id: 'dashboard', nombre: 'Panel Principal', icon: <IconDashboard />, roles: ['auditor', 'coordinador'] },
    { id: 'qr', nombre: 'Generar QR', icon: <IconKey />, roles: ['coordinador'] },
    { id: 'profesores', nombre: 'Profesores', icon: <IconTeachers />, roles: ['coordinador'] },
    { id: 'coordinadores', nombre: 'Agregar Coordinador', icon: <IconAddAdmin />, roles: ['auditor'] },
    { id: 'carreras', nombre: 'Carreras', icon: <IconGraduation />, roles: ['auditor'] },
    { id: 'asignaturas', nombre: 'Asignaturas', icon: <IconBookOpen />, roles: ['coordinador'] },
    { id: 'horarios', nombre: 'Horarios', icon: <IconClock />, roles: ['coordinador'] },
    { id: 'justificativos', nombre: 'Justificativos', icon: <IconClipboard />, roles: ['coordinador'] },
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
             tab.id === 'control-coordinadores' ? 'Gestionar coordinadores de carreras' :
             tab.id === 'reportes' ? 'Ver reportes de asistencia' : ''}
          </p>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      {user?.roles?.includes('auditor') ? null : (
        <LocationAlert enArea={enArea} distancia={distancia} />
      )}
      {/* Estadísticas ocultas para auditor */}
      {!user?.roles?.includes('auditor') && (
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
          <div className="card">
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: 'var(--gold)', textAlign: 'center' }}>
              {(parseFloat(stats.horasHoy) * 1.5).toFixed(1)}
            </div>
            <div style={{ textAlign: 'center' }}>Horas académicas hoy</div>
          </div>
        </div>
      )}
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

export default DashboardCoordinador;