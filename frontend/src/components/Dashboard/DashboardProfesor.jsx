import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import LocationAlert from '../LocationAlert/LocationAlert';
import {
  IconDashboard, IconScanQR, IconClipboard, IconClock, 
  IconBookOpen, IconTeachers, IconAlert, IconCheck, IconInfo 
} from '../Icons/SystemIcons';

const DashboardProfesor = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [estado, setEstado] = useState({ dentro: false, asistenciasHoy: [] });
  const [stats, setStats] = useState({ totalHoy: 0, horasHoy: '0.0' });
  const [distancia, setDistancia] = useState(null);
  const [enArea, setEnArea] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [horarios, setHorarios] = useState([]);
  const [cargandoHorarios, setCargandoHorarios] = useState(true);

  // Obtener ubicación desde el APK (almacenada en el backend)
  const obtenerUbicacionDesdeAPK = useCallback(async () => {
    try {
      const response = await api.get('/geofencing/ubicacion');
      if (response.data.success && response.data.ubicacion) {
        setDistancia(response.data.distancia);
        setEnArea(response.data.enArea);
        setLastUpdate(response.data.ubicacion.fecha_actualizacion);
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
      let scans = 0;
      if (response.data.asistenciasHoy) {
        response.data.asistenciasHoy.forEach(a => {
          if (a.fecha_entrada) scans++;
          if (a.fecha_salida) scans++;
        });
      }
      
      setStats({
        totalHoy: scans,
        horasHoy: calcularHoras(response.data.asistenciasHoy)
      });
    } catch (error) {
      if (error.response?.status !== 403) {
        console.error('Error cargando estado:', error);
      }
    }
  }, [calcularHoras]);

  const cargarHorarios = useCallback(async () => {
    try {
      setCargandoHorarios(true);
      const response = await api.get('/horarios/profesor');
      setHorarios(response.data || []);
    } catch (error) {
      console.error('Error cargando horarios del profesor:', error);
    } finally {
      setCargandoHorarios(false);
    }
  }, []);

  useEffect(() => {
    cargarEstado();
    cargarHorarios();
    obtenerUbicacionDesdeAPK();
    
    const ubicacionInterval = setInterval(obtenerUbicacionDesdeAPK, 5000);
    const estadoInterval = setInterval(cargarEstado, 5000);
    
    return () => {
      clearInterval(ubicacionInterval);
      clearInterval(estadoInterval);
    };
  }, [cargarEstado, cargarHorarios, obtenerUbicacionDesdeAPK]);

  // Formatear horas a formato 12H (ej: 02:15 pm)
  const formatearHora12 = (horaStr) => {
    if (!horaStr) return '';
    const [h, m] = horaStr.split(':');
    let horas = parseInt(h);
    const ampm = horas >= 12 ? 'pm' : 'am';
    horas = horas % 12;
    horas = horas ? horas : 12; // el número '0' debe ser '12'
    const padHoras = horas < 10 ? `0${horas}` : horas;
    return `${padHoras}:${m} ${ampm}`;
  };

  // Calcular las horas académicas (bloques de 45 minutos)
  const calcularHorasAcademicas = (inicio, fin) => {
    if (!inicio || !fin) return 0;
    const [h1, m1] = inicio.split(':').map(Number);
    const [h2, m2] = fin.split(':').map(Number);
    const totalMinutos = (h2 * 60 + m2) - (h1 * 60 + m1);
    return Math.round(totalMinutos / 45);
  };

  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  const horasEje = ['2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM'];

  // Parámetros de posicionamiento absoluto del grid:
  // Hora de inicio del grid: 14:00 (2:00 PM)
  // Hora de fin del grid: 20:00 (8:00 PM)
  // Duración total del grid = 360 minutos (6 horas)
  const CALENDAR_START_MINUTES = 14 * 60; // 14:00
  const CALENDAR_TOTAL_MINUTES = 360; // 6 horas

  const getPosicionEstilo = (inicio, fin) => {
    if (!inicio || !fin) return { top: '0%', height: 'auto' };
    const [h1, m1] = inicio.split(':').map(Number);
    const [h2, m2] = fin.split(':').map(Number);
    
    const minutosInicio = h1 * 60 + m1;
    const minutosFin = h2 * 60 + m2;
    
    const startOffset = minutosInicio - CALENDAR_START_MINUTES;
    const duracion = minutosFin - minutosInicio;
    
    const topPct = (startOffset / CALENDAR_TOTAL_MINUTES) * 100;
    const heightPct = (duracion / CALENDAR_TOTAL_MINUTES) * 100;
    
    return {
      top: `${Math.max(0, Math.min(100, topPct))}%`,
      height: `${Math.max(10, Math.min(100, heightPct))}%`,
      position: 'absolute'
    };
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Alerta de Geofencing activa para firma */}
      <LocationAlert enArea={enArea} distancia={distancia} />

      {/* Header Premium */}
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-amber-500/20 rounded-xl border border-amber-400/30 text-amber-300">
                <IconTeachers className="w-8 h-8" />
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight">
                Panel del Profesor
              </h2>
            </div>
            <p className="text-indigo-200/80 text-sm max-w-xl">
              Gestiona tus lecturas de asistencia, visualiza tus horas trabajadas y audita tu carga académica de forma interactiva.
            </p>
          </div>

          <button 
            onClick={() => navigate('/escanear')}
            className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-2xl shadow-lg shadow-amber-500/20 hover:shadow-xl transition-all flex items-center gap-2 group transform active:scale-95 text-sm"
          >
            <IconScanQR className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            Escanear Asistencia (Entrada/Salida)
          </button>
        </div>
      </div>

      {/* Métricas del día */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lecturas Hoy</p>
            <h3 className="text-3xl font-extrabold text-indigo-600 mt-1">{stats.totalHoy}/2</h3>
            <span className="text-[10px] text-indigo-500 font-semibold block mt-1">Marcar Entrada y Salida</span>
          </div>
          <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600">
            <IconScanQR className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Horas Trabajadas Hoy</p>
            <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">{stats.horasHoy}h</h3>
            <span className="text-[10px] text-emerald-500 font-semibold block mt-1">Tiempo físico en campus</span>
          </div>
          <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600">
            <IconClock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Horas Académicas Equivalentes</p>
            <h3 className="text-3xl font-extrabold text-amber-600 mt-1">
              {(parseFloat(stats.horasHoy) * 1.5).toFixed(1)}h
            </h3>
            <span className="text-[10px] text-amber-500 font-semibold block mt-1">Conversión docente IUJO</span>
          </div>
          <div className="p-4 bg-amber-50 rounded-2xl text-amber-600">
            <IconBookOpen className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ✅ SECCIÓN DE HORARIO EN BLOQUES (WEEKLY CALENDAR GRID - IDENTICAL TO SCREENSHOT) */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-lg leading-tight">📅 Horario de Clases Semanal</h3>
            <p className="text-xs text-gray-400">Distribución de tus materias asignadas, bloques académicos y aulas</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold bg-indigo-50 text-indigo-700 px-3.5 py-1.5 rounded-xl border border-indigo-100">
            <span>📚 Carrera: {user?.nombre_carrera || 'Asignada'}</span>
          </div>
        </div>

        {cargandoHorarios ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 text-sm font-semibold animate-pulse">Cargando horario escolar...</p>
          </div>
        ) : (
          <div>
            {/* Desktop Calendar Grid */}
            <div className="hidden md:block overflow-x-auto custom-scrollbar pb-4">
              <div className="min-w-[850px] bg-white border border-slate-200/80 rounded-3xl shadow-xl shadow-slate-200/40 overflow-hidden relative">
                
                {/* Header Row (Lunes - Viernes) */}
                <div className="grid grid-cols-[80px_repeat(5,_1fr)] bg-slate-50/80 text-slate-700 border-b border-slate-200/80 backdrop-blur-sm">
                  <div className="p-4 border-r border-slate-200/80 font-black text-center text-[10px] uppercase tracking-widest text-slate-400 flex flex-col items-center justify-center gap-1 bg-slate-100/50">
                    <IconClock width={16} height={16} className="text-indigo-400" />
                    <span>Hora</span>
                  </div>
                  {diasSemana.map((dia) => (
                    <div key={dia} className="p-4 font-black text-center text-sm border-r last:border-r-0 border-slate-200/80 flex items-center justify-center gap-2 text-slate-700">
                      <span>{dia}</span>
                    </div>
                  ))}
                </div>

                {/* Body Rows Grid with absolute-positioned blocks */}
                <div className="grid grid-cols-[80px_repeat(5,_1fr)] relative h-[420px] bg-white">
                  
                  {/* Axis Column (2 PM, 3 PM, 4 PM, 5 PM, 6 PM) */}
                  <div className="bg-slate-50/50 border-r border-slate-200/80 flex flex-col justify-between py-4 text-center font-bold text-[10px] text-slate-400 uppercase tracking-wider">
                    {horasEje.map((h) => (
                      <div key={h} className="h-8 flex items-center justify-center border-b border-slate-100 last:border-b-0">
                        {h}
                      </div>
                    ))}
                  </div>

                  {/* Background Grid Lines and Day Columns */}
                  {diasSemana.map((dia) => {
                    const materiasDelDia = horarios.filter(h => h.dia_semana === dia);

                    return (
                      <div key={dia} className="relative border-r last:border-r-0 border-slate-100/80 bg-white h-full hover:bg-slate-50/30 transition-colors">
                        {/* Horizontal guides lines inside each day */}
                        <div className="absolute inset-0 flex flex-col justify-between py-4 pointer-events-none">
                          {[1, 2, 3, 4, 5, 6].map(idx => (
                            <div key={idx} className="w-full border-t border-slate-100/60 border-dashed"></div>
                          ))}
                        </div>

                        {/* Render class blocks for this day */}
                        {materiasDelDia.map((mat) => {
                          const posEstilo = getPosicionEstilo(mat.hora_inicio, mat.hora_fin);

                          return (
                            <div 
                              key={mat.id_horario}
                              style={posEstilo}
                              className="absolute left-1 right-1 rounded-2xl border border-indigo-100/80 bg-gradient-to-br from-indigo-50 to-blue-50/80 text-slate-800 shadow-sm flex flex-col hover:shadow-lg hover:shadow-indigo-200/50 transition-all duration-300 hover:-translate-y-1 hover:z-20 overflow-hidden backdrop-blur-sm cursor-default"
                            >
                              {/* Block Header (Time Bar) */}
                              <div className="bg-indigo-600/90 text-white py-1 px-2 text-center text-[9px] font-black tracking-widest uppercase shadow-sm">
                                {formatearHora12(mat.hora_inicio)} a {formatearHora12(mat.hora_fin)}
                              </div>

                              {/* Block Body */}
                              <div className="p-2 flex-1 flex flex-col justify-center items-center text-center gap-1.5">
                                <div className="font-black text-[10px] sm:text-[11px] leading-tight text-slate-800 transition-colors">
                                  {mat.nombre_asignatura}
                                </div>
                                
                                {mat.aula && (
                                  <div className="text-[9px] font-extrabold text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded-full inline-flex items-center gap-1 border border-indigo-200/50">
                                    📍 {mat.aula}
                                  </div>
                                )}
                                
                                <div className="text-[9px] font-bold text-slate-500 flex items-center gap-1 opacity-90">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]"></span>
                                  {user?.apellido ? `${user.apellido}, ${user.nombre}` : 'Profesor Asignado'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Mobile Responsive Accordion (Collapses into daily cards) */}
            <div className="block md:hidden space-y-4">
              {diasSemana.map((dia) => {
                const materiasDelDia = horarios.filter(h => h.dia_semana === dia);
                if (materiasDelDia.length === 0) return null;

                return (
                  <div key={dia} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                    <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-200 pb-1.5 flex items-center justify-between">
                      <span>📅 {dia}</span>
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-lg">
                        {materiasDelDia.length} clase(s)
                      </span>
                    </h4>

                    <div className="space-y-3">
                      {materiasDelDia.map((mat) => {
                        const acHours = calcularHorasAcademicas(mat.hora_inicio, mat.hora_fin);

                        return (
                          <div 
                            key={mat.id_horario}
                            className="bg-white rounded-xl border border-indigo-200 overflow-hidden shadow-sm flex flex-col"
                          >
                            <div className="bg-indigo-600 text-white py-1 px-3 text-[10px] font-bold flex justify-between items-center">
                              <span>⏰ {formatearHora12(mat.hora_inicio)} a {formatearHora12(mat.hora_fin)}</span>
                              <span className="bg-indigo-800 text-[9px] px-2 py-0.5 rounded font-extrabold">
                                {acHours} Horas Académicas
                              </span>
                            </div>
                            
                            <div className="p-3.5 text-left border-l-4 border-emerald-500 bg-emerald-50/50 space-y-1">
                              <h5 className="font-extrabold text-xs text-slate-800 uppercase">
                                {mat.nombre_asignatura}
                              </h5>
                              <p className="text-[10px] text-slate-500 font-semibold uppercase">
                                🎓 Carrera: {mat.nombre_carrera || user?.nombre_carrera}
                              </p>
                              <div className="flex items-center justify-between pt-1 text-[10px] font-bold text-slate-600">
                                <span>🚪 Aula: <span className="text-emerald-700">{mat.aula || 'N/A'}</span></span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Datos del profesor */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <span className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
            <IconTeachers className="w-6 h-6" />
          </span>
          <div>
            <h3 className="font-extrabold text-slate-800 text-lg leading-tight">Credenciales Docentes</h3>
            <p className="text-xs text-gray-400">Verifica tu perfil de usuario y estatus en el campus</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 text-sm">
          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-semibold block uppercase">Nombre Completo</span>
            <span className="font-bold text-slate-800">{user?.nombre} {user?.apellido}</span>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-semibold block uppercase">Cédula de Identidad</span>
            <span className="font-bold text-slate-800">{user?.cedula || 'No disponible'}</span>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-semibold block uppercase">Correo Institucional</span>
            <span className="font-bold text-slate-800">{user?.correo}</span>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-semibold block uppercase">Teléfono de Contacto</span>
            <span className="font-bold text-slate-800">{user?.telefono || 'No disponible'}</span>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-semibold block uppercase">Carrera Adscrita</span>
            <span className="font-bold text-indigo-600">{user?.nombre_carrera || 'Asignada'}</span>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-semibold block uppercase">Nivel de Acceso</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              <span className="px-2.5 py-1 text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 rounded-lg uppercase tracking-wider">
                Docente Activo
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardProfesor;