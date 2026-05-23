import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import CustomSelect from '../UI/CustomSelect';
import { 
  IconBookOpen, IconPlus, IconEdit, IconTrash, 
  IconSearch, IconClock, IconUsers, IconCancel, 
  IconSave, IconCheck, IconAlert, IconInfo, IconChevronRight
} from '../Icons/SystemIcons';

const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const bloquesAcademicos = [
  // Bloques de 90 minutos (2 Horas Académicas)
  { value: '14:15-15:45', label: 'Bloque Doble 1: 02:15 PM - 03:45 PM' },
  { value: '15:45-17:15', label: 'Bloque Doble 2: 03:45 PM - 05:15 PM' },
  { value: '17:15-18:30', label: 'Bloque Doble 3: 05:15 PM - 06:30 PM' },
  { value: '18:30-20:00', label: 'Bloque Doble 4: 06:30 PM - 08:00 PM' },
  // Bloques de 45 minutos (1 Hora Académica)
  { value: '14:15-15:00', label: 'Bloque Sencillo 1: 02:15 PM - 03:00 PM' },
  { value: '15:00-15:45', label: 'Bloque Sencillo 2: 03:00 PM - 03:45 PM' },
  { value: '15:45-16:30', label: 'Bloque Sencillo 3: 03:45 PM - 04:30 PM' },
  { value: '16:30-17:15', label: 'Bloque Sencillo 4: 04:30 PM - 05:15 PM' },
  { value: '17:15-18:00', label: 'Bloque Sencillo 5: 05:15 PM - 06:00 PM' },
  { value: '18:00-18:45', label: 'Bloque Sencillo 6: 06:00 PM - 06:45 PM' },
  { value: '18:45-19:30', label: 'Bloque Sencillo 7: 06:45 PM - 07:30 PM' },
  { value: '19:30-20:00', label: 'Bloque Sencillo 8: 07:30 PM - 08:00 PM' }
];

const GestionAsignaturasHorarios = () => {
  const { user } = useAuth();
  const esCoordinador = user?.roles?.includes('coordinador') || user?.roles?.includes('adjunto coordinacion');
  const esAuditor = user?.roles?.includes('auditor');

  const formatTime12 = (timeStr) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    let h = parseInt(parts[0]);
    const m = parts[1] ? parts[1].substring(0, 2) : '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m} ${ampm}`;
  };

  const formatTime12Full = (timeStr) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    let h = parseInt(parts[0]);
    const m = parts[1] ? parts[1].substring(0, 2) : '00';
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12;
    h = h ? h : 12;
    const padH = h < 10 ? `0${h}` : h;
    return `${padH}:${m} ${ampm}`;
  };

  const getPosicionEstiloGeneral = (inicio, fin) => {
    if (!inicio || !fin) return { top: '0%', height: 'auto' };
    const [h1, m1] = inicio.split(':').map(Number);
    const [h2, m2] = fin.split(':').map(Number);
    
    const CALENDAR_START_MINUTES = 14 * 60; // 14:00 (2:00 PM)
    const CALENDAR_TOTAL_MINUTES = 360; // 6 horas (hasta 20:00)
    
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

  const diasSemanaFiltrados = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

  const [asignaturas, setAsignaturas] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [asignaturasProfesores, setAsignaturasProfesores] = useState([]);
  
  // Formulario de asignatura
  const [nombreAsignatura, setNombreAsignatura] = useState('');
  const [idCarrera, setIdCarrera] = useState('');
  const [editandoAsignatura, setEditandoAsignatura] = useState(null);
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState('');

  // Nuevos estados para la interactividad de la gráfica por bloques
  const [showModalHorario, setShowModalHorario] = useState(false);
  const [modoHorario, setModoHorario] = useState('crear');
  const [horarioEdicion, setHorarioEdicion] = useState(null);
  const [horarioForm, setHorarioForm] = useState({
    nombre_asignatura: '',
    id_profesor: '',
    dia_semana: 'Lunes',
    bloque: '14:15-15:45',
    aula: ''
  });
  
  // Estado para el buscador/filtro de profesores
  const [filtroProfesor, setFiltroProfesor] = useState('');
  
  // Modales
  const [showModalAsignarProfesor, setShowModalAsignarProfesor] = useState(false);
  const [showModalConfirmacion, setShowModalConfirmacion] = useState(false);
  const [asignaturaSeleccionada, setAsignaturaSeleccionada] = useState(null);
  const [profesorSeleccionadoData, setProfesorSeleccionadoData] = useState(null);
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  
  // Modal para eliminar horario
  const [modalEliminarHorario, setModalEliminarHorario] = useState({ mostrar: false, id_horario: null });
  
  // Buscador de profesores
  const [busquedaProfesor, setBusquedaProfesor] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [buscandoProfesor, setBuscandoProfesor] = useState(false);
  const [mostrarResultados, setMostrarResultados] = useState(false);

  // Buscador de profesores (Modal Horario)
  const [busquedaProfesorModal, setBusquedaProfesorModal] = useState('');
  const [resultadosBusquedaModal, setResultadosBusquedaModal] = useState([]);
  const [buscandoProfesorModal, setBuscandoProfesorModal] = useState(false);
  const [mostrarResultadosModal, setMostrarResultadosModal] = useState(false);
  
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [asignaturaExpandida, setAsignaturaExpandida] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, [user]);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [asigRes, carrRes, profRes, horRes, asignProfRes] = await Promise.all([
        api.get('/asignaturas'),
        api.get('/carreras'),
        api.get('/profesores/todos'),
        api.get('/horarios'),
        api.get('/horarios/asignaturas-profesores')
      ]);
      
      const idCarreraCoordinador = user?.id_carrera;

      let asignaturasFiltradas = asigRes.data;
      let profesoresFiltrados = profRes.data;
      let carrerasFiltradas = carrRes.data;

      if (esCoordinador && !esAuditor && idCarreraCoordinador) {
        asignaturasFiltradas = asigRes.data.filter(a => a.id_carrera == idCarreraCoordinador);
        profesoresFiltrados = profRes.data.filter(p => p.id_carrera == idCarreraCoordinador);
        carrerasFiltradas = carrRes.data.filter(c => c.id_carrera == idCarreraCoordinador);
      }

      setAsignaturas(asignaturasFiltradas);
      setCarreras(carrerasFiltradas);
      setProfesores(profesoresFiltrados);
      setHorarios(horRes.data);
      setAsignaturasProfesores(asignProfRes.data);

      if (esCoordinador && !esAuditor && idCarreraCoordinador && !editandoAsignatura) {
        setIdCarrera(idCarreraCoordinador.toString());
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      setError('Error al cargar la información');
    } finally {
      setCargando(false);
    }
  };

  const handleGuardarAsignatura = async (e) => {
    e.preventDefault();
    try {
      if (editandoAsignatura) {
        await api.put(`/asignaturas/${editandoAsignatura.id_asignatura}`, {
          nombre_asignatura: nombreAsignatura,
          id_carrera: idCarrera
        });
        setMensaje('✅ Asignatura actualizada');
      } else {
        await api.post('/asignaturas', {
          nombre_asignatura: nombreAsignatura,
          id_carrera: idCarrera
        });
        setMensaje('✅ Asignatura creada');
      }
      setNombreAsignatura('');
      setEditandoAsignatura(null);
      cargarDatos();
      setTimeout(() => setMensaje(''), 3000);
    } catch (error) {
      setError('Error al guardar asignatura');
      setTimeout(() => setError(''), 3000);
    }
  };

  const buscarProfesores = async (query) => {
    if (query.length < 2) {
      setResultadosBusqueda([]);
      setMostrarResultados(false);
      return;
    }
    setBuscandoProfesor(true);
    try {
      const res = await api.get(`/profesores/buscar?q=${query}`);
      setResultadosBusqueda(res.data);
      setMostrarResultados(true);
    } catch (error) {
      console.error(error);
    } finally {
      setBuscandoProfesor(false);
    }
  };

  const buscarProfesoresModal = async (query) => {
    if (query.length < 2) {
      setResultadosBusquedaModal([]);
      setMostrarResultadosModal(false);
      return;
    }
    setBuscandoProfesorModal(true);
    try {
      const res = await api.get(`/profesores/buscar?q=${query}`);
      
      let filtrados = res.data;
      if (esCoordinador && !esAuditor && user?.id_carrera) {
        filtrados = res.data.filter(p => Number(p.id_carrera) === Number(user.id_carrera));
      }
      
      setResultadosBusquedaModal(filtrados);
      setMostrarResultadosModal(true);
    } catch (error) {
      console.error(error);
    } finally {
      setBuscandoProfesorModal(false);
    }
  };

  const handleGuardarAsignacion = async () => {
    if (!profesorSeleccionadoData || !asignaturaSeleccionada) return;
    try {
      await api.post('/horarios/asignar-profesor', {
        id_asignatura: asignaturaSeleccionada.id_asignatura,
        id_profesor: profesorSeleccionadoData.id_profesor,
        fecha_inicio: fechaInicio
      });
      setMensaje('✅ Profesor asignado correctamente');
      setShowModalAsignarProfesor(false);
      setShowModalConfirmacion(false);
      setProfesorSeleccionadoData(null);
      setBusquedaProfesor('');
      cargarDatos();
      setTimeout(() => setMensaje(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Error al asignar profesor');
      setShowModalConfirmacion(false);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleAgregarHorario = async (e, id_ap) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    if (!bloqueSeleccionado) {
      setError('❌ Por favor, selecciona un bloque de horario');
      setTimeout(() => setError(''), 5000);
      return;
    }

    const [hora_inicio, hora_fin] = bloqueSeleccionado.split('-');
    
    const data = {
      id_asignatura_profesor: id_ap,
      dia_semana: formData.get('dia_semana'),
      hora_inicio,
      hora_fin,
      aula: formData.get('aula')
    };

    try {
      await api.post('/horarios', data);
      setMensaje('✅ Horario agregado');
      setBloqueSeleccionado('');
      cargarDatos();
      e.target.reset();
      setTimeout(() => setMensaje(''), 5000);
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.error || error.response?.data?.mensaje || 'Error al agregar horario';
      setError(`❌ ${msg}`);
      setTimeout(() => setError(''), 6000);
    }
  };

  const handleEliminarHorario = async () => {
    const { id_horario } = modalEliminarHorario;
    try {
      await api.delete(`/horarios/${id_horario}`);
      setMensaje('✅ Horario eliminado');
      setModalEliminarHorario({ mostrar: false, id_horario: null });
      cargarDatos();
      setTimeout(() => setMensaje(''), 3000);
    } catch (error) {
      setError('Error al eliminar horario');
      setModalEliminarHorario({ mostrar: false, id_horario: null });
    }
  };

  // ✅ NUEVOS HELPERS PARA GESTIONAR HORARIOS DESDE LA GRÁFICA
  const handleAbrirCrearHorario = (dia = 'Lunes') => {
    setModoHorario('crear');
    setHorarioEdicion(null);
    setHorarioForm({
      nombre_asignatura: '',
      id_profesor: '',
      dia_semana: dia,
      bloque: '14:15-15:45',
      aula: ''
    });
    setBusquedaProfesorModal('');
    setMostrarResultadosModal(false);
    setShowModalHorario(true);
  };

  const handleAbrirEditarHorario = (h) => {
    setModoHorario('editar');
    setHorarioEdicion(h);
    
    // Obtener formato HH:MM-HH:MM para el select de bloques
    const start = h.hora_inicio.substring(0, 5);
    const end = h.hora_fin.substring(0, 5);
    const bloqueVal = `${start}-${end}`;
    
    // Buscar asignatura y profesor del bloque en asignaturasProfesores
    const ap = asignaturasProfesores.find(x => Number(x.id_asignatura_profesor) === Number(h.id_asignatura_profesor));
    const idProfesor = ap ? ap.id_profesor.toString() : '';
    const nombreProfesor = ap ? `👨‍🏫 ${ap.nombre} ${ap.apellido}` : '';
    
    setHorarioForm({
      nombre_asignatura: h.nombre_asignatura || '',
      id_profesor: idProfesor,
      dia_semana: h.dia_semana,
      bloque: bloqueVal,
      aula: h.aula || ''
    });
    setBusquedaProfesorModal(nombreProfesor);
    setMostrarResultadosModal(false);
    setShowModalHorario(true);
  };

  const handleGuardarHorarioModal = async (e) => {
    e.preventDefault();
    if (!horarioForm.nombre_asignatura || !horarioForm.nombre_asignatura.trim()) {
      setError('❌ Por favor, ingresa el nombre de la asignatura.');
      setTimeout(() => setError(''), 5000);
      return;
    }
    if (!horarioForm.id_profesor) {
      setError('❌ Por favor, selecciona un profesor.');
      setTimeout(() => setError(''), 5000);
      return;
    }
    
    const [hora_inicio, hora_fin] = horarioForm.bloque.split('-');
    
    try {
      let id_asignatura = null;
      
      // 1. Buscar si ya existe la asignatura por nombre (case-insensitive)
      const asigExistente = asignaturas.find(
        a => a.nombre_asignatura.trim().toLowerCase() === horarioForm.nombre_asignatura.trim().toLowerCase()
      );
      
      if (asigExistente) {
        id_asignatura = asigExistente.id_asignatura;
      } else {
        // Si no existe, crear la asignatura automáticamente
        const carreraId = user?.id_carrera || (user?.ids_carreras && user.ids_carreras[0]) || idCarrera || 1;
        const newAsigRes = await api.post('/asignaturas', {
          nombre_asignatura: horarioForm.nombre_asignatura.trim(),
          id_carrera: parseInt(carreraId)
        });
        id_asignatura = newAsigRes.data.id_asignatura;
      }
      
      let id_asignatura_profesor = null;
      
      // 2. Buscar si ya existe la asignación asignatura_profesor
      const apExistente = asignaturasProfesores.find(
        ap => Number(ap.id_asignatura) === Number(id_asignatura) && 
              Number(ap.id_profesor) === Number(horarioForm.id_profesor)
      );
      
      if (apExistente) {
        id_asignatura_profesor = apExistente.id_asignatura_profesor;
      } else {
        // Si no existe la asignación, crearla en la base de datos
        const asigProfRes = await api.post('/horarios/asignar-profesor', {
          id_asignatura: parseInt(id_asignatura),
          id_profesor: parseInt(horarioForm.id_profesor)
        });
        id_asignatura_profesor = asigProfRes.data.asignacion.id_asignatura_profesor;
      }
      
      const data = {
        id_asignatura_profesor,
        dia_semana: horarioForm.dia_semana,
        hora_inicio,
        hora_fin,
        aula: horarioForm.aula
      };
      
      if (modoHorario === 'crear') {
        await api.post('/horarios', data);
        setMensaje('✅ Horario agregado con éxito');
      } else {
        await api.put(`/horarios/${horarioEdicion.id_horario}`, data);
        setMensaje('✅ Horario actualizado con éxito');
      }
      setShowModalHorario(false);
      cargarDatos();
      setTimeout(() => setMensaje(''), 5000);
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.error || error.response?.data?.mensaje || 'Error al procesar el horario';
      setError(`❌ ${msg}`);
      setTimeout(() => setError(''), 6000);
    }
  };

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      {/* Header Premium */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100 text-2xl">
            <IconBookOpen />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Asignaturas y Horarios</h1>
            <p className="text-slate-500 font-medium">Gestiona la carga académica y distribución horaria</p>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {(mensaje || error) && (
        <div className="space-y-3">
          {mensaje && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-6 py-4 rounded-2xl flex items-center gap-3 animate-slide-in shadow-sm">
              <IconCheck /> <span className="font-bold">{mensaje}</span>
            </div>
          )}
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 px-6 py-4 rounded-2xl flex items-center gap-3 animate-shake shadow-sm">
              <IconAlert /> <span className="font-bold">{error}</span>
            </div>
          )}
        </div>
      )}

      {/* ✅ SECCIÓN DE CALENDARIO GENERAL DE HORARIOS POR BLOQUES (ESTRUCTURA DE SCREENSHOT) */}
      <div className="bg-white p-6 sm:p-8 rounded-[32px] shadow-sm border border-slate-100 space-y-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-extrabold text-slate-800 text-lg leading-tight">🏫 Sede Caracas</h3>
              <button 
                onClick={() => handleAbrirCrearHorario('Lunes')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1 active:scale-95"
              >
                <IconPlus width={12} height={12} /> Agregar Horario
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Distribución de asignaturas en el mapa de bloques académicos semanales (Haz click en un bloque para editarlo o eliminarlo)</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold bg-indigo-50 text-indigo-700 px-3.5 py-1.5 rounded-xl border border-indigo-100">
            <span>📚 Total Horarios: {horarios.length} bloques</span>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar pb-4">
          <div className="min-w-[850px] bg-white border border-slate-200/80 rounded-3xl shadow-xl shadow-slate-200/40 overflow-hidden relative">
            
            {/* Header Row (Lunes - Viernes) */}
            <div className="grid grid-cols-[80px_repeat(5,_1fr)] bg-slate-50/80 text-slate-700 border-b border-slate-200/80 backdrop-blur-sm">
              <div className="p-4 border-r border-slate-200/80 font-black text-center text-[10px] uppercase tracking-widest text-slate-400 flex flex-col items-center justify-center gap-1 bg-slate-100/50">
                <IconClock width={16} height={16} className="text-indigo-400" />
                <span>Hora</span>
              </div>
              {diasSemanaFiltrados.map((dia) => (
                <div key={dia} className="p-4 font-black text-center text-sm border-r last:border-r-0 border-slate-200/80 flex items-center justify-center gap-2 group text-slate-700">
                  <span>{dia}</span>
                  <button 
                    onClick={() => handleAbrirCrearHorario(dia)}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all text-sm font-bold shadow-sm"
                    title={`Agregar horario el ${dia}`}
                  >
                    +
                  </button>
                </div>
              ))}
            </div>

            {/* Body Rows Grid with absolute-positioned blocks */}
            <div className="grid grid-cols-[80px_repeat(5,_1fr)] relative h-[420px] bg-white">
              
              {/* Axis Column (2 PM, 3 PM, 4 PM, 5 PM, 6 PM, 7 PM) */}
              <div className="bg-slate-50/50 border-r border-slate-200/80 flex flex-col justify-between py-4 text-center font-bold text-[10px] text-slate-400 uppercase tracking-wider">
                {['2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM'].map((h) => (
                  <div key={h} className="h-8 flex items-center justify-center border-b border-slate-100 last:border-b-0">
                    {h}
                  </div>
                ))}
              </div>

              {/* Background Grid Lines and Day Columns */}
              {diasSemanaFiltrados.map((dia) => {
                const materiasDelDia = horarios.filter(h => h.dia_semana === dia);

                return (
                  <div key={dia} className="relative border-r last:border-r-0 border-slate-100/80 bg-white h-full group/col hover:bg-slate-50/30 transition-colors">
                    {/* Horizontal guides lines inside each day */}
                    <div className="absolute inset-0 flex flex-col justify-between py-4 pointer-events-none">
                      {[1, 2, 3, 4, 5, 6].map(idx => (
                        <div key={idx} className="w-full border-t border-slate-100/60 border-dashed"></div>
                      ))}
                    </div>

                    {/* Render class blocks for this day */}
                    {materiasDelDia.map((mat) => {
                      const posEstilo = getPosicionEstiloGeneral(mat.hora_inicio, mat.hora_fin);

                      return (
                        <div 
                          key={mat.id_horario}
                          style={posEstilo}
                          onClick={() => handleAbrirEditarHorario(mat)}
                          className="absolute left-1 right-1 rounded-2xl border border-indigo-100/80 bg-gradient-to-br from-indigo-50 to-blue-50/80 text-slate-800 shadow-sm flex flex-col hover:shadow-lg hover:shadow-indigo-200/50 transition-all duration-300 hover:-translate-y-1 hover:z-20 group cursor-pointer overflow-hidden backdrop-blur-sm"
                        >
                          {/* Block Header (Time Bar) */}
                          <div className="bg-indigo-600/90 text-white py-1 px-2 text-center text-[9px] font-black tracking-widest uppercase shadow-sm">
                            {formatTime12Full(mat.hora_inicio)} a {formatTime12Full(mat.hora_fin)}
                          </div>

                          {/* Block Body */}
                          <div className="p-2 flex-1 flex flex-col justify-center items-center text-center gap-1.5">
                            <div className="font-black text-[10px] sm:text-[11px] leading-tight text-slate-800 group-hover:text-indigo-700 transition-colors">
                              {mat.nombre_asignatura}
                            </div>
                            
                            {mat.aula && (
                              <div className="text-[9px] font-extrabold text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded-full inline-flex items-center gap-1 border border-indigo-200/50">
                                📍 {mat.aula}
                              </div>
                            )}
                            
                            <div className="text-[9px] font-bold text-slate-500 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]"></span>
                              {mat.apellido && mat.nombre ? `${mat.apellido}, ${mat.nombre}` : 'Profesor Asignado'}
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
      </div>

      {/* MODALES MODERNOS */}

      {/* Modal Asignar Profesor */}
      {showModalAsignarProfesor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setShowModalAsignarProfesor(false)}></div>
          <div className="bg-white rounded-[40px] w-full max-w-xl p-8 sm:p-10 shadow-2xl relative z-10 animate-zoom-in overflow-visible">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-800">Asignar Docente</h3>
                <p className="text-indigo-600 font-bold text-sm">Asignatura: {asignaturaSeleccionada?.nombre_asignatura}</p>
              </div>
              <button onClick={() => setShowModalAsignarProfesor(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center">
                <IconCancel />
              </button>
            </div>

            <div className="space-y-6">
              <div className="relative group">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Buscar por Nombre o Cédula</label>
                <div className="relative">
                  <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input
                    type="text"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700"
                    placeholder="Escriba al menos 2 caracteres..."
                    value={busquedaProfesor}
                    onChange={(e) => {
                      setBusquedaProfesor(e.target.value);
                      buscarProfesores(e.target.value);
                    }}
                    autoComplete="off"
                  />
                  {buscandoProfesor && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>

                {/* Resultados de búsqueda premium */}
                {mostrarResultados && (
                  <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-slate-100 rounded-3xl shadow-2xl shadow-indigo-200/50 max-h-64 overflow-y-auto z-50 p-2 custom-scrollbar animate-slide-in">
                    {resultadosBusqueda.length > 0 ? (
                      resultadosBusqueda.map(prof => (
                        <button
                          key={prof.id_profesor}
                          className="w-full flex items-center justify-between p-4 hover:bg-indigo-50 rounded-2xl transition-all group text-left"
                          onClick={() => {
                            setProfesorSeleccionadoData(prof);
                            setMostrarResultados(false);
                            setBusquedaProfesor(`${prof.nombre} ${prof.apellido}`);
                          }}
                        >
                          <div>
                            <div className="font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{prof.nombre} {prof.apellido}</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{prof.cedula} • {prof.correo}</div>
                          </div>
                          <IconChevronRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                        </button>
                      ))
                    ) : (
                      <div className="p-8 text-center text-slate-400 font-medium">No se encontraron resultados</div>
                    )}
                  </div>
                )}
              </div>

              {profesorSeleccionadoData && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-[32px] p-6 flex items-center gap-5 animate-slide-in shadow-sm shadow-emerald-100">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-xl font-black text-emerald-600 shadow-sm border border-emerald-50">
                    {profesorSeleccionadoData.nombre[0]}{profesorSeleccionadoData.apellido[0]}
                  </div>
                  <div>
                    <div className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Docente Seleccionado</div>
                    <div className="font-black text-slate-800 text-lg">{profesorSeleccionadoData.nombre} {profesorSeleccionadoData.apellido}</div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 block">Fecha de Inicio de Actividades</label>
                <input 
                  type="date" 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-bold"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <button 
                onClick={() => setShowModalConfirmacion(true)}
                disabled={!profesorSeleccionadoData}
                className={`w-full py-5 rounded-[24px] font-black transition-all flex items-center justify-center gap-3 shadow-xl ${profesorSeleccionadoData ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'}`}
              >
                Continuar con la Asignación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación Final */}
      {showModalConfirmacion && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowModalConfirmacion(false)}></div>
          <div className="bg-white rounded-[40px] w-full max-w-md p-10 shadow-3xl relative z-10 animate-zoom-in text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-indigo-400 rounded-[32px] flex items-center justify-center text-4xl shadow-2xl shadow-indigo-200 mx-auto mb-8 border-4 border-white">
              <IconInfo className="text-white" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">¿Confirmar Asignación?</h3>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed px-4">
              Estás por asignar a <strong className="text-slate-800">{profesorSeleccionadoData?.nombre} {profesorSeleccionadoData?.apellido}</strong> para impartir la asignatura <strong className="text-indigo-600">{asignaturaSeleccionada?.nombre_asignatura}</strong>.
            </p>
            
            <div className="flex gap-3">
              <button onClick={handleGuardarAsignacion} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95">
                Confirmar
              </button>
              <button onClick={() => setShowModalConfirmacion(false)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all">
                Revisar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Eliminar Horario */}
      {modalEliminarHorario.mostrar && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setModalEliminarHorario({ mostrar: false, id_horario: null })}></div>
          <div className="bg-white rounded-[40px] w-full max-w-sm p-10 shadow-3xl relative z-10 animate-zoom-in text-center">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[24px] flex items-center justify-center text-3xl mx-auto mb-6 shadow-lg shadow-rose-100">
              <IconTrash />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">¿Eliminar Horario?</h3>
            <p className="text-slate-500 font-medium mb-8">Esta acción quitará el bloque horario de la asignatura. ¿Deseas continuar?</p>
            <div className="flex gap-3">
              <button onClick={handleEliminarHorario} className="flex-1 bg-rose-500 text-white py-4 rounded-2xl font-black hover:bg-rose-600 transition-all shadow-xl shadow-rose-200 active:scale-95">Eliminar</button>
              <button onClick={() => setModalEliminarHorario({ mostrar: false, id_horario: null })} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ MODAL INTERACTIVO PARA AGREGAR/EDITAR HORARIOS DESDE LA GRÁFICA */}
      {showModalHorario && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setShowModalHorario(false)}></div>
          <div className="bg-white rounded-[40px] w-full max-w-xl p-8 sm:p-10 shadow-2xl relative z-10 animate-zoom-in overflow-visible">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-800">
                  {modoHorario === 'crear' ? 'Agregar Bloque Horario' : 'Editar Bloque Horario'}
                </h3>
                <p className="text-indigo-600 font-bold text-sm">
                  {modoHorario === 'crear' ? 'Configura la distribución horaria de la asignatura' : 'Modifica los parámetros de este bloque académico'}
                </p>
              </div>
              <button onClick={() => setShowModalHorario(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center">
                <IconCancel />
              </button>
            </div>

            <form onSubmit={handleGuardarHorarioModal} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 block">Asignatura</label>
                  <input
                    type="text"
                    required
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 placeholder:font-semibold"
                    placeholder="Ej: Base de Datos o Programación"
                    value={horarioForm.nombre_asignatura}
                    onChange={(e) => setHorarioForm({ ...horarioForm, nombre_asignatura: e.target.value })}
                  />
                </div>

                <div className="space-y-2 relative">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 block">Profesor / Docente</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 placeholder:font-semibold"
                      placeholder="Buscar profesor..."
                      value={busquedaProfesorModal}
                      onChange={(e) => {
                        setBusquedaProfesorModal(e.target.value);
                        buscarProfesoresModal(e.target.value);
                        setHorarioForm(prev => ({ ...prev, id_profesor: '' }));
                      }}
                      autoComplete="off"
                    />
                    {buscandoProfesorModal && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>

                  {mostrarResultadosModal && (
                    <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-slate-100 rounded-3xl shadow-2xl shadow-indigo-200/50 max-h-60 overflow-y-auto z-50 p-2 custom-scrollbar animate-slide-in">
                      {resultadosBusquedaModal.length > 0 ? (
                        resultadosBusquedaModal.map(prof => (
                          <button
                            key={prof.id_profesor}
                            type="button"
                            className="w-full flex items-center justify-between p-3.5 hover:bg-indigo-50 rounded-2xl transition-all group text-left"
                            onClick={() => {
                              setHorarioForm(prev => ({ ...prev, id_profesor: prof.id_profesor.toString() }));
                              setBusquedaProfesorModal(`👨‍🏫 ${prof.nombre} ${prof.apellido}`);
                              setMostrarResultadosModal(false);
                            }}
                          >
                            <div>
                              <div className="font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                                👨‍🏫 {prof.nombre} {prof.apellido}
                              </div>
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                {prof.cedula} • {prof.correo}
                              </div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm font-bold text-slate-400">
                          No se encontraron profesores
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 block">Día de la Semana</label>
                  <CustomSelect
                    value={horarioForm.dia_semana}
                    onChange={(val) => setHorarioForm({ ...horarioForm, dia_semana: val })}
                    options={diasSemana.map(d => ({ value: d, label: d }))}
                    placeholder="Seleccionar día..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 block">Aula / Salón</label>
                  <input
                    type="text"
                    required
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700"
                    placeholder="Ej: A-102 o 5º B"
                    value={horarioForm.aula}
                    onChange={(e) => setHorarioForm({ ...horarioForm, aula: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 block">Bloque Académico</label>
                <CustomSelect
                  value={horarioForm.bloque}
                  onChange={(val) => setHorarioForm({ ...horarioForm, bloque: val })}
                  options={bloquesAcademicos}
                  placeholder="Seleccionar bloque..."
                  direction="up"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button 
                  type="submit" 
                  className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <IconSave /> {modoHorario === 'crear' ? 'Agregar Horario' : 'Guardar Cambios'}
                </button>
                {modoHorario === 'editar' && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setModalEliminarHorario({ mostrar: true, id_horario: horarioEdicion.id_horario });
                      setShowModalHorario(false);
                    }} 
                    className="bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 py-4 px-6 rounded-2xl font-black transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <IconTrash /> Eliminar Bloque
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionAsignaturasHorarios;
