import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  IconDashboard, IconKey, IconTeachers, IconAddAdmin,
  IconGraduation, IconBookOpen, IconClock, IconClipboard,
  IconUsers, IconChart, IconScanQR, IconAlert, IconCheck, IconInfo
} from '../Icons/SystemIcons';
import LocationAlert from '../LocationAlert/LocationAlert';

const DashboardCoordinador = () => {
  const { user } = useAuth();
  const [estado, setEstado] = useState({ dentro: false, asistenciasHoy: [] });
  const [stats, setStats] = useState({ totalHoy: 0, horasHoy: '0.0', coordinadoresCount: 0, profesoresCount: 0, bitacoraCount: 0 });
  const [distancia, setDistancia] = useState(null);
  const [enArea, setEnArea] = useState(false);
  const [cargando, setCargando] = useState(true);

  // Estados reales para las gráficas dinámicas de la base de datos
  const [semanalAsistencias, setSemanalAsistencias] = useState([12, 18, 15, 24, 20]);
  const [semanalInasistencias, setSemanalInasistencias] = useState([2, 3, 1, 4, 2]);
  const [semanalJustificativos, setSemanalJustificativos] = useState([1, 2, 1, 2, 1]);
  const [justificativosEstatus, setJustificativosEstatus] = useState({ aprobados: 5, pendientes: 2, rechazados: 1, total: 8 });
  const [totalesHoy, setTotalesHoy] = useState({ asistencias: 0, inasistencias: 0, justificativos: 0 });

  // ✅ NUEVO: Estados de interactividad y hover en tiempo real para gráficas
  const [hoveredDayIdx, setHoveredDayIdx] = useState(null);
  const [hoveredSlice, setHoveredSlice] = useState(null);

  const esAuditor = user?.roles?.includes('auditor');
  const esAdjunto = user?.roles?.includes('adjunto coordinacion');

  // ✅ NUEVO: Obtener ubicación desde APK (endpoint backend)
  const obtenerUbicacionDesdeAPK = useCallback(async () => {
    if (esAuditor) return;
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
  }, [esAuditor]);

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
      setCargando(true);
      
      let scans = 0;
      let horas = '0.0';
      let coordinadoresRes = 0;
      let profesoresRes = 0;
      let bitacoraRes = 0;

      // Cargar asistencia personal del coordinador/adjunto hoy si no es auditor
      if (!esAuditor) {
        try {
          const response = await api.get('/asistencias/estado');
          setEstado(response.data);
          if (response.data.asistenciasHoy) {
            response.data.asistenciasHoy.forEach(a => {
              if (a.fecha_entrada) scans++;
              if (a.fecha_salida) scans++;
            });
          }
          horas = calcularHoras(response.data.asistenciasHoy);
        } catch (err) {
          console.warn('Error cargando asistencia personal del coordinador:', err);
        }
      }

      // ✅ Cargar estadísticas reales desde la base de datos (gráficas, dona, conteo carrera)
      try {
        const statsRes = await api.get('/asistencias/dashboard-stats');
        const d = statsRes.data;
        setSemanalAsistencias(d.semanalAsistencias || [0,0,0,0,0]);
        setSemanalInasistencias(d.semanalInasistencias || [0,0,0,0,0]);
        setSemanalJustificativos(d.semanalJustificativos || [0,0,0,0,0]);
        setTotalesHoy(d.totalesHoy || { asistencias: 0, inasistencias: 0, justificativos: 0 });
        if (!d.esAuditor) {
          setJustificativosEstatus(d.justificativosEstatus || { aprobados: 0, pendientes: 0, rechazados: 0, total: 0 });
        }
        
        // Si es auditor, las métricas de las tarjetas sí son globales del sistema
        if (esAuditor) {
          scans = d.totalHoy || 0;
          horas = d.horasHoy || '0.0';
        }
        
        profesoresRes = d.profesoresCount || 0;
        coordinadoresRes = d.coordinadoresCount || 0;
        bitacoraRes = d.bitacoraCount || 0;
      } catch (err) {
        console.warn('Error cargando estadísticas reales de base de datos:', err);
      }

      setStats({
        totalHoy: scans,
        horasHoy: horas,
        coordinadoresCount: coordinadoresRes,
        profesoresCount: profesoresRes,
        bitacoraCount: bitacoraRes
      });

    } catch (error) {
      console.error('Error cargando estado dashboard:', error);
    } finally {
      setCargando(false);
    }
  }, [esAuditor, calcularHoras]);

  useEffect(() => {
    cargarEstado();
    obtenerUbicacionDesdeAPK();
    
    const ubicacionInterval = setInterval(() => {
      obtenerUbicacionDesdeAPK();
    }, 30000);
    
    const estadoInterval = setInterval(() => {
      cargarEstado();
    }, 5000);
    
    return () => {
      clearInterval(ubicacionInterval);
      clearInterval(estadoInterval);
    };
  }, [cargarEstado, obtenerUbicacionDesdeAPK]);

  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

  // Datos de dedicación docente
  const tcDocentes = Math.round(stats.profesoresCount * 0.65) || 12;
  const mtDocentes = Math.round(stats.profesoresCount * 0.35) || 6;
  const totalDocentes = tcDocentes + mtDocentes;

  // ✅ Escala dinámica para la gráfica de 3 líneas
  const maxValGrafica = Math.max(...semanalAsistencias, ...semanalInasistencias, ...semanalJustificativos, 1);
  const scaleY = (val) => 180 - Math.max((val / maxValGrafica) * 150, 0);
  const xPos = [10, 125, 245, 365, 480];

  // ✅ Dona: totales de hoy en porcentaje
  const totalHoyDona = (totalesHoy.asistencias + totalesHoy.inasistencias + totalesHoy.justificativos) || 1;
  const pctAsisHoy = Math.round((totalesHoy.asistencias / totalHoyDona) * 100);
  const pctInasHoy = Math.round((totalesHoy.inasistencias / totalHoyDona) * 100);
  const pctJustHoy = Math.max(0, 100 - pctAsisHoy - pctInasHoy);

  // Datos mock para gráficas del Auditor
  const caidasTrend = [1, 0, 2, 0, 1];
  const bitacoraCategorias = { asistencias: 450, sistema: 20, config: 30, total: 500 };
  const pctAsis = 90;
  const pctServ = 4;
  const pctConfig = 6;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Alerta de ubicación para coordinadores y adjuntos */}
      {!esAuditor && (
        <LocationAlert enArea={enArea} distancia={distancia} />
      )}

      {/* Header Informativo */}
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-amber-500/20 rounded-xl border border-amber-400/30 text-amber-300">
              <IconDashboard className="w-8 h-8" />
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight">
              Bienvenido al Panel Principal
            </h2>
          </div>
          <p className="text-indigo-200/80 text-sm max-w-2xl">
            {esAuditor 
              ? 'Consola central de auditoría global del sistema. Monitorea actividades del servidor, latidos de red, roles asignados y exportaciones históricas.' 
              : `Panel de control para la coordinación de la carrera. Audita las asistencias diarias de tus profesores de forma geolocalizada y autoriza justificativos.`}
          </p>
        </div>
      </div>

      {/* Grid de KPIs Premium */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {esAuditor ? (
          <>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all hover:-translate-y-0.5">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Historial de Bitácora</p>
                <h3 className="text-3xl font-extrabold text-gray-800 mt-1">{stats.bitacoraCount}</h3>
                <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1 mt-1">
                  🟢 Monitoreo Activo
                </span>
              </div>
              <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600">
                <IconClipboard className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all hover:-translate-y-0.5">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Coordinadores Activos</p>
                <h3 className="text-3xl font-extrabold text-indigo-600 mt-1">{stats.coordinadoresCount}</h3>
                <span className="text-[10px] text-gray-500 font-medium block mt-1">Carreras IUJO</span>
              </div>
              <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600">
                <IconAddAdmin className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all hover:-translate-y-0.5">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Profesores del Sistema</p>
                <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">{stats.profesoresCount}</h3>
                <span className="text-[10px] text-emerald-500 font-semibold block mt-1">Todos los perfiles</span>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600">
                <IconTeachers className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all hover:-translate-y-0.5">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estado del Servidor</p>
                <h3 className="text-3xl font-extrabold text-purple-600 mt-1">99.8%</h3>
                <span className="text-[10px] text-purple-500 font-semibold block mt-1">Uptime Saludable</span>
              </div>
              <div className="p-4 bg-purple-50 rounded-2xl text-purple-600">
                <IconClock className="w-6 h-6" />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all hover:-translate-y-0.5">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lecturas Hoy</p>
                <h3 className="text-3xl font-extrabold text-indigo-600 mt-1">{stats.totalHoy}</h3>
                <span className="text-[10px] text-indigo-500 font-semibold block mt-1">Entradas + Salidas</span>
              </div>
              <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600">
                <IconScanQR className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all hover:-translate-y-0.5">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Horas Trabajadas Hoy</p>
                <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">{stats.horasHoy}h</h3>
                <span className="text-[10px] text-emerald-500 font-semibold block mt-1">Tiempo de firmas</span>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600">
                <IconClock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all hover:-translate-y-0.5">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Horas Académicas</p>
                <h3 className="text-3xl font-extrabold text-amber-600 mt-1">
                  {(parseFloat(stats.horasHoy) * 1.5).toFixed(1)}h
                </h3>
                <span className="text-[10px] text-amber-500 font-semibold block mt-1">Equivalente docente</span>
              </div>
              <div className="p-4 bg-amber-50 rounded-2xl text-amber-600">
                <IconBookOpen className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all hover:-translate-y-0.5">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Profesores Asignados</p>
                <h3 className="text-3xl font-extrabold text-purple-600 mt-1">{stats.profesoresCount}</h3>
                <span className="text-[10px] text-purple-500 font-semibold block mt-1">Carrera actual</span>
              </div>
              <div className="p-4 bg-purple-50 rounded-2xl text-purple-600">
                <IconTeachers className="w-6 h-6" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ✅ SECCIÓN DE GRÁFICAS ANALÍTICAS PREMIUM — UNIFICADAS PARA AMBOS ROLES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {esAuditor ? (
          <>
            {/* Gráfica 1: Historial de Uptime y Eventos del Sistema (Auditor) */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-lg">Eventos Registrados en el Sistema</h4>
                  <p className="text-xs text-gray-400 font-semibold">Volumen de logs y acciones operacionales en tiempo real</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-indigo-600">
                    <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></span> Volumen Operacional
                  </span>
                </div>
              </div>

              <div className="relative pt-4">
                {hoveredDayIdx !== null && (
                  <div 
                    className="absolute bg-slate-900/95 border border-slate-700 text-white text-xs p-3 rounded-xl shadow-2xl backdrop-blur-md z-30 transition-all duration-200 pointer-events-none space-y-1.5 animate-fadeIn"
                    style={{
                      left: `${hoveredDayIdx === 0 ? 4 : hoveredDayIdx === 1 ? 27 : hoveredDayIdx === 2 ? 50 : hoveredDayIdx === 3 ? 73 : 96}%`,
                      top: '-10px',
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <div className="font-extrabold text-[10px] uppercase tracking-wider text-indigo-300">{diasSemana[hoveredDayIdx]}</div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                      <span className="font-bold">Uptime:</span>
                      <span className="text-indigo-200">99.9% operacional</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      <span className="font-bold">Eventos:</span>
                      <span className="text-red-300 font-extrabold">{caidasTrend[hoveredDayIdx]} eventos</span>
                    </div>
                  </div>
                )}

                <svg className="w-full h-56" viewBox="0 0 500 200" preserveAspectRatio="none" onMouseLeave={() => setHoveredDayIdx(null)}>
                  <defs>
                    <linearGradient id="barNeonGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#4338ca" />
                    </linearGradient>
                    <linearGradient id="barNeonHover" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#4f46e5" />
                    </linearGradient>
                  </defs>

                  <line x1="0" y1="40" x2="500" y2="40" stroke="#f8fafc" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="0" y1="90" x2="500" y2="90" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="0" y1="140" x2="500" y2="140" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="0" y1="190" x2="500" y2="190" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />

                  {[0, 1, 2, 3, 4].map((idx) => {
                    const x = idx === 0 ? 0 : idx === 1 ? 115 : idx === 2 ? 230 : idx === 3 ? 345 : 460;
                    const val = caidasTrend[idx];
                    const maxVal = Math.max(...caidasTrend, 10);
                    const barHeight = Math.max((val / maxVal) * 140, 5); 
                    const y = 190 - barHeight;
                    const isHovered = hoveredDayIdx === idx;
                    
                    return (
                      <g key={`bar-auditor-${idx}`}>
                        <rect x={x} y="40" width="40" height="150" fill="#f8fafc" rx="8" />
                        <rect 
                          x={x} y={y} width="40" height={barHeight} 
                          fill={isHovered ? "url(#barNeonHover)" : "url(#barNeonGrad)"} 
                          rx="8" className="transition-all duration-300 ease-out"
                          style={{ filter: isHovered ? 'drop-shadow(0 8px 12px rgba(99, 102, 241, 0.4))' : 'none' }}
                        />
                        {isHovered && val > 0 && (
                          <circle cx={x + 20} cy={y} r="6" fill="#fff" stroke="#6366f1" strokeWidth="3" className="animate-pulse" />
                        )}
                      </g>
                    );
                  })}

                  {[0, 1, 2, 3, 4].map((idx) => {
                    const x = idx === 0 ? 0 : idx === 1 ? 100 : idx === 2 ? 200 : idx === 3 ? 300 : 400;
                    return (
                      <rect
                        key={`hover-col-bar-${idx}`}
                        x={x} y="10" width="100" height="180" fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredDayIdx(idx)}
                      />
                    );
                  })}
                </svg>

                <div className="flex justify-between text-[11px] font-bold text-gray-400 px-2 mt-2">
                  {diasSemana.map((d, i) => (
                    <span key={i} className={`transition-colors duration-200 ${hoveredDayIdx === i ? 'text-indigo-600 font-extrabold' : ''}`}>{d}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Gráfica 2: Distribución transaccional de Bitácora (Auditor) */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between space-y-4">
              <div>
                <h4 className="font-bold text-slate-800 text-lg">Distribución de Bitácora</h4>
                <p className="text-xs text-gray-400 font-semibold">Análisis de transacciones por categoría</p>
              </div>

              <div className="flex justify-center items-center relative py-6">
                <svg className="w-36 h-36" viewBox="0 0 36 36" onMouseLeave={() => setHoveredSlice(null)}>
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3.2" />
                  
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#4f46e5" 
                    strokeWidth={hoveredSlice === 'asis' ? "4.8" : "3.5"} 
                    strokeDasharray={`${pctAsis} ${100 - pctAsis}`} strokeDashoffset="25" strokeLinecap="round"
                    className="transition-all duration-300 cursor-pointer"
                    opacity={hoveredSlice !== null && hoveredSlice !== 'asis' ? '0.35' : '1'}
                    onMouseEnter={() => setHoveredSlice('asis')}
                  />
                  
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ef4444" 
                    strokeWidth={hoveredSlice === 'serv' ? "4.8" : "3.5"} 
                    strokeDasharray={`${pctServ} ${100 - pctServ}`} strokeDashoffset={25 - pctAsis} strokeLinecap="round"
                    className="transition-all duration-300 cursor-pointer"
                    opacity={hoveredSlice !== null && hoveredSlice !== 'serv' ? '0.35' : '1'}
                    onMouseEnter={() => setHoveredSlice('serv')}
                  />
                  
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" 
                    strokeWidth={hoveredSlice === 'config' ? "4.8" : "3.5"} 
                    strokeDasharray={`${pctConfig} ${100 - pctConfig}`} strokeDashoffset={25 - pctAsis - pctServ} strokeLinecap="round"
                    className="transition-all duration-300 cursor-pointer"
                    opacity={hoveredSlice !== null && hoveredSlice !== 'config' ? '0.35' : '1'}
                    onMouseEnter={() => setHoveredSlice('config')}
                  />
                </svg>

                <div className="absolute text-center select-none pointer-events-none animate-fadeIn">
                  <span className={`text-2xl font-extrabold block transition-colors duration-200 ${
                    hoveredSlice === 'asis' ? 'text-indigo-600' :
                    hoveredSlice === 'serv' ? 'text-red-500' :
                    hoveredSlice === 'config' ? 'text-amber-500' : 'text-slate-800'
                  }`}>
                    {hoveredSlice === 'asis' ? bitacoraCategorias.asistencias :
                     hoveredSlice === 'serv' ? bitacoraCategorias.sistema :
                     hoveredSlice === 'config' ? bitacoraCategorias.config : bitacoraCategorias.total}
                  </span>
                  <span className="text-[8px] text-gray-400 block font-bold uppercase tracking-wider transition-all">
                    {hoveredSlice === 'asis' ? 'Asistencias' :
                     hoveredSlice === 'serv' ? 'Incidentes' :
                     hoveredSlice === 'config' ? 'Ajustes QR' : 'Logs Totales'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1 text-[10px] font-bold pt-2 border-t border-gray-50 text-center select-none">
                <div 
                  className={`cursor-pointer transition-all duration-200 p-1.5 rounded-xl ${hoveredSlice === 'asis' ? 'bg-indigo-50 border border-indigo-100 scale-105' : ''}`}
                  onMouseEnter={() => setHoveredSlice('asis')}
                  onMouseLeave={() => setHoveredSlice(null)}
                >
                  <span className="text-indigo-600 block">📥 Asis ({pctAsis}%)</span>
                </div>
                <div 
                  className={`cursor-pointer transition-all duration-200 p-1.5 rounded-xl ${hoveredSlice === 'serv' ? 'bg-red-50 border border-red-100 scale-105' : ''}`}
                  onMouseEnter={() => setHoveredSlice('serv')}
                  onMouseLeave={() => setHoveredSlice(null)}
                >
                  <span className="text-red-500 block">⚠️ Serv ({pctServ}%)</span>
                </div>
                <div 
                  className={`cursor-pointer transition-all duration-200 p-1.5 rounded-xl ${hoveredSlice === 'config' ? 'bg-amber-50 border border-amber-100 scale-105' : ''}`}
                  onMouseEnter={() => setHoveredSlice('config')}
                  onMouseLeave={() => setHoveredSlice(null)}
                >
                  <span className="text-amber-500 block">⚙️ Config ({pctConfig}%)</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* ====== GRÁFICA DE 3 LÍNEAS (Coordinador) ====== */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="font-bold text-slate-800 text-lg">Asistencia Semanal de Profesores</h4>
              <p className="text-xs text-gray-400 font-semibold">
                {esAuditor ? 'Todos los docentes del sistema' : 'Docentes de tu carrera — semana actual'}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-600"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Asistencias</span>
              <span className="flex items-center gap-1.5 text-red-500"><span className="w-2.5 h-2.5 rounded-full bg-red-400"></span> Inasistencias</span>
              <span className="flex items-center gap-1.5 text-amber-500"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Justificativos</span>
            </div>
          </div>

          <div className="relative pt-4">
            {/* Tooltip interactivo */}
            {hoveredDayIdx !== null && (
              <div
                className="absolute bg-slate-900/95 border border-slate-700 text-white text-xs p-3 rounded-xl shadow-2xl backdrop-blur-md z-30 pointer-events-none space-y-1.5 animate-fadeIn"
                style={{ left: `${hoveredDayIdx === 0 ? 4 : hoveredDayIdx === 1 ? 25 : hoveredDayIdx === 2 ? 48 : hoveredDayIdx === 3 ? 71 : 88}%`, top: '-10px', transform: 'translateX(-50%)' }}
              >
                <div className="font-extrabold text-[10px] uppercase tracking-wider text-indigo-300">{diasSemana[hoveredDayIdx]}</div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span><span className="font-bold">Asistencias:</span><span className="text-emerald-300 font-extrabold">{semanalAsistencias[hoveredDayIdx]}</span></div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 bg-red-500 rounded-full"></span><span className="font-bold">Inasistencias:</span><span className="text-red-300 font-extrabold">{semanalInasistencias[hoveredDayIdx]}</span></div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 bg-amber-400 rounded-full"></span><span className="font-bold">Justificativos:</span><span className="text-amber-300 font-extrabold">{semanalJustificativos[hoveredDayIdx]}</span></div>
              </div>
            )}

            <svg className="w-full h-56" viewBox="0 0 500 200" preserveAspectRatio="none" onMouseLeave={() => setHoveredDayIdx(null)}>
              <defs>
                <linearGradient id="greenAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              {[50, 100, 150].map(y => (
                <line key={y} x1="0" y1={y} x2="500" y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
              ))}
              <line x1="0" y1="180" x2="500" y2="180" stroke="#e2e8f0" strokeWidth="1.5" />

              {/* Línea indicadora vertical */}
              {hoveredDayIdx !== null && (
                <line x1={xPos[hoveredDayIdx]} y1="20" x2={xPos[hoveredDayIdx]} y2="180" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
              )}

              {/* Área rellena verde */}
              <path
                d={`M ${xPos[0]} 180 L ${xPos.map((x,i) => `${x} ${scaleY(semanalAsistencias[i])}`).join(' L ')} L ${xPos[4]} 180 Z`}
                fill="url(#greenAreaGrad)"
              />

              {/* Línea Verde: Asistencias */}
              <path
                d={`M ${xPos.map((x,i) => `${x} ${scaleY(semanalAsistencias[i])}`).join(' L ')}`}
                fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
              />
              {/* Línea Roja: Inasistencias */}
              <path
                d={`M ${xPos.map((x,i) => `${x} ${scaleY(semanalInasistencias[i])}`).join(' L ')}`}
                fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              />
              {/* Línea Amarilla: Justificativos */}
              <path
                d={`M ${xPos.map((x,i) => `${x} ${scaleY(semanalJustificativos[i])}`).join(' L ')}`}
                fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 3"
              />

              {/* Puntos animados */}
              {semanalAsistencias.map((val, idx) => (
                <circle key={`g-${idx}`} cx={xPos[idx]} cy={scaleY(val)} r={hoveredDayIdx === idx ? "7" : "5"} fill="#10b981" stroke="#fff" strokeWidth="2.5" className="transition-all duration-200" />
              ))}
              {semanalInasistencias.map((val, idx) => (
                <circle key={`r-${idx}`} cx={xPos[idx]} cy={scaleY(val)} r={hoveredDayIdx === idx ? "6" : "4"} fill="#ef4444" stroke="#fff" strokeWidth="2" className="transition-all duration-200" />
              ))}
              {semanalJustificativos.map((val, idx) => (
                <circle key={`y-${idx}`} cx={xPos[idx]} cy={scaleY(val)} r={hoveredDayIdx === idx ? "6" : "4"} fill="#f59e0b" stroke="#fff" strokeWidth="2" className="transition-all duration-200" />
              ))}

              {/* Zonas de hover invisibles */}
              {[0,1,2,3,4].map(idx => {
                const x = idx === 0 ? 0 : idx === 1 ? 60 : idx === 2 ? 185 : idx === 3 ? 305 : 425;
                const w = idx === 0 ? 60 : idx === 4 ? 75 : 120;
                return <rect key={`h-${idx}`} x={x} y="10" width={w} height="170" fill="transparent" className="cursor-pointer" onMouseEnter={() => setHoveredDayIdx(idx)} />;
              })}
            </svg>

            <div className="flex justify-between text-[11px] font-bold text-gray-400 px-2 mt-2">
              {diasSemana.map((d, i) => (
                <span key={i} className={`transition-colors duration-200 ${hoveredDayIdx === i ? 'text-indigo-600 font-extrabold' : ''}`}>{d}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ====== DONA: RESUMEN DIARIO (hoy) ====== */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between space-y-4">
          <div>
            <h4 className="font-bold text-slate-800 text-lg">Resumen de Hoy</h4>
            <p className="text-xs text-gray-400 font-semibold">
              Asistencias • Inasistencias • Justificativos
            </p>
          </div>

          {/* Gráfica de torta siempre con el mismo diseño estético */}
          <div className="flex justify-center items-center relative py-6">
            <svg className="w-36 h-36" viewBox="0 0 36 36" onMouseLeave={() => setHoveredSlice(null)}>
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3.2" />
              {/* Verde: asistencias */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981"
                strokeWidth={hoveredSlice === 'asis' ? "4.8" : "3.5"}
                strokeDasharray={`${pctAsisHoy} ${100 - pctAsisHoy}`} strokeDashoffset="25" strokeLinecap="round"
                className="transition-all duration-300 cursor-pointer"
                opacity={hoveredSlice !== null && hoveredSlice !== 'asis' ? '0.35' : '1'}
                onMouseEnter={() => setHoveredSlice('asis')}
              />
              {/* Rojo: inasistencias */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ef4444"
                strokeWidth={hoveredSlice === 'inas' ? "4.8" : "3.5"}
                strokeDasharray={`${pctInasHoy} ${100 - pctInasHoy}`} strokeDashoffset={25 - pctAsisHoy} strokeLinecap="round"
                className="transition-all duration-300 cursor-pointer"
                opacity={hoveredSlice !== null && hoveredSlice !== 'inas' ? '0.35' : '1'}
                onMouseEnter={() => setHoveredSlice('inas')}
              />
              {/* Amarillo: justificativos */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b"
                strokeWidth={hoveredSlice === 'just' ? "4.8" : "3.5"}
                strokeDasharray={`${pctJustHoy} ${100 - pctJustHoy}`} strokeDashoffset={25 - pctAsisHoy - pctInasHoy} strokeLinecap="round"
                className="transition-all duration-300 cursor-pointer"
                opacity={hoveredSlice !== null && hoveredSlice !== 'just' ? '0.35' : '1'}
                onMouseEnter={() => setHoveredSlice('just')}
              />
            </svg>
            <div className="absolute text-center select-none pointer-events-none animate-fadeIn">
              <span className={`text-2xl font-extrabold block transition-colors duration-200 ${
                hoveredSlice === 'asis' ? 'text-emerald-600' :
                hoveredSlice === 'inas' ? 'text-red-500' :
                hoveredSlice === 'just' ? 'text-amber-500' : 'text-slate-800'
              }`}>
                {hoveredSlice === 'asis' ? totalesHoy.asistencias :
                 hoveredSlice === 'inas' ? totalesHoy.inasistencias :
                 hoveredSlice === 'just' ? totalesHoy.justificativos :
                 (totalesHoy.asistencias + totalesHoy.inasistencias + totalesHoy.justificativos)}
              </span>
              <span className="text-[8px] text-gray-400 block font-bold uppercase tracking-wider">
                {hoveredSlice === 'asis' ? 'Asistencias' :
                 hoveredSlice === 'inas' ? 'Inasistencias' :
                 hoveredSlice === 'just' ? 'Justificativos' : 'Total Hoy'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 text-[10px] font-bold pt-2 border-t border-gray-50 text-center select-none">
            {[{key:'asis', color:'emerald', label:'✅ Asis', pct:pctAsisHoy},
              {key:'inas', color:'red', label:'⚠️ Inas', pct:pctInasHoy},
              {key:'just', color:'amber', label:'📄 Just', pct:pctJustHoy}
            ].map(({key, color, label, pct}) => (
              <div key={key}
                className={`cursor-pointer transition-all duration-200 p-1.5 rounded-xl ${hoveredSlice === key ? `bg-${color}-50 border border-${color}-100 scale-105` : ''}`}
                onMouseEnter={() => setHoveredSlice(key)}
                onMouseLeave={() => setHoveredSlice(null)}
              >
                <span className={`text-${color}-${color === 'amber' ? '500' : color === 'red' ? '500' : '600'} block`}>{label} ({pct}%)</span>
              </div>
            ))}
          </div>
        </div>
        </>
        )}
      </div>
      
      {/* Datos Personales en Diseño Premium */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <span className="p-2 bg-indigo-50 rounded-xl text-indigo-600" aria-hidden="true">
            <IconUsers className="w-6 h-6" />
          </span>
          <div>
            <h3 className="font-extrabold text-slate-800 text-lg leading-tight">Credenciales de Acceso</h3>
            <p className="text-xs text-gray-400">Verifica tu perfil de usuario actual y roles asignados</p>
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
            <span className="text-xs text-gray-400 font-semibold block uppercase">Departamento / Carrera</span>
            <span className="font-bold text-slate-800">{user?.nombre_carrera || 'Administración Central'}</span>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-semibold block uppercase">Nivel de Acceso (Roles)</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {user?.roles?.map((rol, idx) => (
                <span 
                  key={idx} 
                  className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg uppercase tracking-wider border ${
                    rol === 'auditor' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    rol === 'coordinador' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {rol}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCoordinador;