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

const GestionAsignaturasHorarios = () => {
  const { user } = useAuth();
  const [asignaturas, setAsignaturas] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [asignaturasProfesores, setAsignaturasProfesores] = useState([]);
  
  // Formulario de asignatura
  const [nombreAsignatura, setNombreAsignatura] = useState('');
  const [idCarrera, setIdCarrera] = useState('');
  const [editandoAsignatura, setEditandoAsignatura] = useState(null);
  
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
      
      const esCoordinador = user?.roles?.includes('coordinador');
      const esAuditor = user?.roles?.includes('auditor');
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
    const data = {
      id_asignatura_profesor: id_ap,
      dia_semana: formData.get('dia_semana'),
      hora_inicio: formData.get('hora_inicio'),
      hora_fin: formData.get('hora_fin'),
      aula: formData.get('aula')
    };
    try {
      await api.post('/horarios', data);
      setMensaje('✅ Horario agregado');
      cargarDatos();
      e.target.reset();
      setTimeout(() => setMensaje(''), 3000);
    } catch (error) {
      setError('Error al agregar horario');
      setTimeout(() => setError(''), 3000);
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Formulario Asignatura */}
        <div className="xl:col-span-4 bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 sticky top-24">
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <IconPlus />
            </div>
            {editandoAsignatura ? 'Editar Asignatura' : 'Nueva Asignatura'}
          </h2>
          <form onSubmit={handleGuardarAsignatura} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Nombre de Asignatura</label>
              <input
                required type="text"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                value={nombreAsignatura}
                onChange={(e) => setNombreAsignatura(e.target.value)}
                placeholder="Ej: Programación Orientada a Objetos"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Carrera</label>
              <CustomSelect
                options={carreras.map(c => ({ value: c.id_carrera, label: c.nombre_carrera }))}
                value={idCarrera}
                onChange={(val) => setIdCarrera(val)}
                placeholder="Seleccionar carrera..."
                disabled={user?.roles?.includes('coordinador') && !user?.roles?.includes('auditor')}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button type="submit" className="flex-1 bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-95">
                <IconSave /> {editandoAsignatura ? 'Actualizar' : 'Guardar Asignatura'}
              </button>
              {editandoAsignatura && (
                <button type="button" onClick={() => { setEditandoAsignatura(null); setNombreAsignatura(''); }} className="bg-slate-100 text-slate-500 px-6 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all active:scale-95">
                  <IconCancel />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Tabla de Asignaturas */}
        <div className="xl:col-span-8 bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Asignatura</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Carrera</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Profesor Asignado</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {asignaturas.map((asig) => {
                  const asigProf = asignaturasProfesores.find(ap => ap.id_asignatura === asig.id_asignatura);
                  const estaExpandida = asignaturaExpandida === asig.id_asignatura;
                  
                  return (
                    <React.Fragment key={asig.id_asignatura}>
                      <tr className={`hover:bg-slate-50/50 transition-colors ${estaExpandida ? 'bg-indigo-50/30' : ''}`}>
                        <td className="px-6 py-5">
                          <div className="font-bold text-slate-800">{asig.nombre_asignatura}</div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-xs font-black bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg uppercase">
                            {asig.nombre_carrera}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          {asigProf ? (
                            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                              <IconUsers width={16} height={16} />
                              {asigProf.nombre_profesor}
                            </div>
                          ) : (
                            <button 
                              onClick={() => { setAsignaturaSeleccionada(asig); setShowModalAsignarProfesor(true); }}
                              className="text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl text-xs font-black hover:bg-amber-600 hover:text-white transition-all border border-amber-100 flex items-center gap-1.5"
                            >
                              <IconPlus width={12} height={12} /> Asignar Profesor
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setAsignaturaExpandida(estaExpandida ? null : asig.id_asignatura)}
                              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${estaExpandida ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                              title="Ver Horarios"
                            >
                              <IconClock />
                            </button>
                            <button
                              onClick={() => { setEditandoAsignatura(asig); setNombreAsignatura(asig.nombre_asignatura); setIdCarrera(asig.id_carrera.toString()); }}
                              className="w-9 h-9 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all"
                            >
                              <IconEdit />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {estaExpandida && (
                        <tr>
                          <td colSpan="4" className="px-8 py-6 bg-indigo-50/20 border-l-4 border-indigo-600">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                              {/* Lista de Horarios */}
                              <div className="space-y-4">
                                <h4 className="font-black text-indigo-900 flex items-center gap-2">
                                  <IconClock className="text-indigo-600" /> Horarios Establecidos
                                </h4>
                                <div className="space-y-2">
                                  {horarios.filter(h => h.id_asignatura === asig.id_asignatura).length > 0 ? (
                                    horarios.filter(h => h.id_asignatura === asig.id_asignatura).map(h => (
                                      <div key={h.id_horario} className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-100 flex justify-between items-center animate-slide-in">
                                        <div>
                                          <div className="font-bold text-slate-800">{h.dia_semana}</div>
                                          <div className="text-xs font-medium text-slate-500 uppercase tracking-tighter">
                                            {h.hora_inicio} - {h.hora_fin} • Aula: {h.aula || 'N/A'}
                                          </div>
                                        </div>
                                        <button 
                                          onClick={() => setModalEliminarHorario({ mostrar: true, id_horario: h.id_horario })}
                                          className="w-8 h-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all flex items-center justify-center"
                                        >
                                          <IconTrash width={16} height={16} />
                                        </button>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="p-8 border-2 border-dashed border-indigo-100 rounded-3xl text-center text-indigo-300">
                                      No hay horarios registrados
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Formulario Agregar Horario */}
                              {asigProf ? (
                                <div className="space-y-4">
                                  <h4 className="font-black text-indigo-900">Agregar Bloque</h4>
                                  <form onSubmit={(e) => handleAgregarHorario(e, asigProf.id_asignatura_profesor)} className="grid grid-cols-2 gap-3 bg-white p-6 rounded-3xl shadow-sm border border-indigo-100">
                                    <div className="col-span-2">
                                      <CustomSelect
                                        name="dia_semana" required
                                        options={diasSemana.map(d => ({ value: d, label: d }))}
                                        placeholder="Seleccionar día..."
                                      />
                                    </div>
                                    <input type="time" name="hora_inicio" required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-indigo-400 text-sm font-bold" />
                                    <input type="time" name="hora_fin" required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-indigo-400 text-sm font-bold" />
                                    <input type="text" name="aula" placeholder="Aula (ej: A-102)" className="col-span-2 w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-indigo-400 text-sm font-bold" />
                                    <button type="submit" className="col-span-2 mt-2 bg-indigo-600 text-white py-3 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                                      Agregar Horario
                                    </button>
                                  </form>
                                </div>
                              ) : (
                                <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 text-amber-800 text-sm font-medium flex items-center gap-3">
                                  <IconInfo className="flex-shrink-0" />
                                  Debes asignar un profesor a la asignatura antes de poder registrar horarios.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
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
    </div>
  );
};

export default GestionAsignaturasHorarios;
