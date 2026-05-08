import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import CustomSelect from '../UI/CustomSelect';
import { 
  IconTeachers, IconPlus, IconEdit, IconTrash, 
  IconSearch, IconMail, IconIdCard, IconGraduation,
  IconCancel, IconSave, IconCheck, IconAlert, IconX
} from '../Icons/SystemIcons';

const ListaProfesores = () => {
  const { user } = useAuth();
  const [profesores, setProfesores] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  
  // Estados para modales
  const [showModalAgregar, setShowModalAgregar] = useState(false);
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [showModalEliminar, setShowModalEliminar] = useState(false);
  const [showModalConfirmar, setShowModalConfirmar] = useState(false);

  // Estado para el profesor seleccionado
  const [profesorActual, setProfesorActual] = useState(null);
  const [nuevoProfesor, setNuevoProfesor] = useState({
    nombre: '',
    apellido: '',
    cedula: '',
    correo: '',
    telefono: '',
    id_carrera: ''
  });

  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [profRes, carrRes] = await Promise.all([
        api.get('/profesores'),
        api.get('/carreras')
      ]);
      setProfesores(profRes.data);
      
      // Filtrar carreras disponibles para el selector (si es coordinador y no auditor)
      let carrerasFiltradas = carrRes.data;
      if (user?.roles?.includes('coordinador') && !user?.roles?.includes('auditor') && user?.ids_carreras) {
        carrerasFiltradas = carrRes.data.filter(c => user.ids_carreras.includes(c.id_carrera));
      }
      setCarreras(carrerasFiltradas);
    } catch (err) {
      console.error(err);
      setError('Error al cargar datos');
    } finally {
      setCargando(false);
    }
  };

  const handleAgregar = async (e) => {
    e.preventDefault();
    try {
      await api.post('/profesores', nuevoProfesor);
      setMensaje('✅ Profesor agregado exitosamente');
      setShowModalAgregar(false);
      setNuevoProfesor({ nombre: '', apellido: '', cedula: '', correo: '', telefono: '', id_carrera: '' });
      cargarDatos();
      setTimeout(() => setMensaje(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al agregar profesor');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleEditar = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put(`/profesores/${profesorActual.id_profesor}`, {
        nombre: profesorActual.nombre,
        apellido: profesorActual.apellido,
        correo: profesorActual.correo,
        cedula: profesorActual.cedula,
        telefono: profesorActual.telefono,
        id_carrera: profesorActual.id_carrera
      });
      
      if (response.data.success) {
        setMensaje('✅ Datos del profesor actualizados');
        setShowModalEditar(false);
        cargarDatos();
        setTimeout(() => setMensaje(''), 3000);
      }
    } catch (err) {
      console.error('Error editando profesor:', err);
      setError(err.response?.data?.error || 'Error al editar profesor');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleEliminar = async () => {
    try {
      await api.delete(`/profesores/${profesorActual.id_profesor}`);
      setMensaje('✅ Profesor eliminado');
      setShowModalEliminar(false);
      cargarDatos();
      setTimeout(() => setMensaje(''), 3000);
    } catch (err) {
      setError('Error al eliminar profesor');
      setTimeout(() => setError(''), 3000);
    }
  };

  const profesoresFiltrados = profesores.filter(p => 
    `${p.nombre} ${p.apellido}`.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.cedula?.includes(busqueda)
  );

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-indigo-600">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <p className="font-medium animate-pulse">Cargando nómina de profesores...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header Premium */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
            <IconTeachers />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Gestión de Profesores</h1>
            <p className="text-slate-500 font-medium">Administra el personal docente de la institución</p>
          </div>
        </div>
        <button
          onClick={() => setShowModalAgregar(true)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 hover:shadow-indigo-200 transition-all flex items-center gap-2 shadow-lg active:scale-95"
        >
          <IconPlus /> Agregar Profesor
        </button>
      </div>

      {/* Barra de Búsqueda y Alertas */}
      <div className="flex flex-col gap-4">
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

        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 group-focus-within:text-indigo-600 transition-colors">
            <IconSearch />
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre, apellido o cédula..."
            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de Profesores */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {profesoresFiltrados.map(prof => (
          <div key={prof.id_profesor} className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-[64px] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
            
            <div className="flex items-start gap-4 mb-6 relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl flex items-center justify-center text-2xl font-bold text-indigo-600 border border-white shadow-inner">
                {prof.nombre[0]}{prof.apellido[0]}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 leading-tight">{prof.nombre} {prof.apellido}</h3>
                <p className="text-indigo-600 text-xs font-black uppercase tracking-widest mt-1 bg-indigo-50 px-2 py-0.5 rounded-lg w-fit">
                  {prof.nombre_carrera || 'Sin Carrera'}
                </p>
              </div>
            </div>

            <div className="space-y-3 relative z-10">
              <div className="flex items-center gap-3 text-slate-500 text-sm">
                <IconIdCard width={18} height={18} className="text-slate-400" />
                <span className="font-medium">{prof.cedula || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500 text-sm">
                <IconMail width={18} height={18} className="text-slate-400" />
                <span className="font-medium truncate">{prof.correo}</span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50 flex justify-end gap-2 relative z-10">
              <button
                onClick={() => { setProfesorActual(prof); setShowModalEditar(true); }}
                className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all active:scale-90"
                title="Editar"
              >
                <IconEdit />
              </button>
              <button
                onClick={() => { setProfesorActual(prof); setShowModalEliminar(true); }}
                className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all active:scale-90"
                title="Eliminar"
              >
                <IconTrash />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Agregar Profesor */}
      {showModalAgregar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setShowModalAgregar(false)}></div>
          <div className="bg-white rounded-[24px] w-full max-w-2xl p-6 shadow-2xl relative z-10 animate-zoom-in">
             <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-50">
               <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl">
                 <IconTeachers />
               </div>
               <div>
                 <h3 className="text-xl font-black text-slate-800 leading-none">Registrar Profesor</h3>
                 <p className="text-slate-400 text-xs font-medium mt-1">Crea una nueva cuenta de docente</p>
               </div>
             </div>

             <button onClick={() => setShowModalAgregar(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-600 transition-colors">
               <IconX />
             </button>

            <form onSubmit={handleAgregar} className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Nombre</label>
                <input
                  required type="text"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                  value={nuevoProfesor.nombre}
                  onChange={(e) => setNuevoProfesor({ ...nuevoProfesor, nombre: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Apellido</label>
                <input
                  required type="text"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                  value={nuevoProfesor.apellido}
                  onChange={(e) => setNuevoProfesor({ ...nuevoProfesor, apellido: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Cédula</label>
                <input
                  required type="text"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                  value={nuevoProfesor.cedula}
                  onChange={(e) => setNuevoProfesor({ ...nuevoProfesor, cedula: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Correo Electrónico</label>
                <input
                  required type="email"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                  value={nuevoProfesor.correo}
                  onChange={(e) => setNuevoProfesor({ ...nuevoProfesor, correo: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Carrera Asignada</label>
                <CustomSelect
                  options={carreras.map(c => ({ value: c.id_carrera, label: c.nombre_carrera }))}
                  value={nuevoProfesor.id_carrera}
                  onChange={(val) => setNuevoProfesor({ ...nuevoProfesor, id_carrera: val })}
                  placeholder="Seleccionar carrera..."
                />
              </div>
              
              <div className="md:col-span-2 flex gap-3 pt-6">
                <button type="submit" className="flex-1 bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-95">
                  <IconSave /> Registrar Profesor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Profesor (similar structure) */}
      {showModalEditar && profesorActual && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setShowModalEditar(false)}></div>
          <div className="bg-white rounded-[24px] w-full max-w-2xl p-6 shadow-2xl relative z-10 animate-zoom-in max-h-[95vh] overflow-y-auto custom-scrollbar overflow-x-visible">
              <div className="flex items-center gap-4 mb-8">
                <div className="text-amber-600 text-2xl">
                  <IconEdit />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 leading-none">Editar Profesor</h3>
                  <p className="text-slate-400 text-xs font-medium mt-1">Actualiza los datos personales y carrera</p>
                </div>
              </div>

             <button onClick={() => setShowModalEditar(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-600 transition-colors">
               <IconX />
             </button>

            <form onSubmit={handleEditar} className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 overflow-visible">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Carrera Asignada</label>
                <CustomSelect
                  options={carreras.map(c => ({ value: c.id_carrera, label: c.nombre_carrera }))}
                  value={profesorActual.id_carrera}
                  onChange={(val) => setProfesorActual({ ...profesorActual, id_carrera: val })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Nombre</label>
                <input
                  required type="text"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all text-sm font-medium"
                  value={profesorActual.nombre}
                  onChange={(e) => setProfesorActual({ ...profesorActual, nombre: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Apellido</label>
                <input
                  required type="text"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all text-sm font-medium"
                  value={profesorActual.apellido}
                  onChange={(e) => setProfesorActual({ ...profesorActual, apellido: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Cédula</label>
                <input
                  required type="text"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all text-sm font-medium"
                  value={profesorActual.cedula}
                  onChange={(e) => setProfesorActual({ ...profesorActual, cedula: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Teléfono</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all text-sm font-medium"
                  value={profesorActual.telefono || ''}
                  onChange={(e) => setProfesorActual({ ...profesorActual, telefono: e.target.value })}
                  placeholder="Ej: 0412-1234567"
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Correo Electrónico</label>
                <input
                  required type="email"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all text-sm font-medium"
                  value={profesorActual.correo}
                  onChange={(e) => setProfesorActual({ ...profesorActual, correo: e.target.value })}
                />
              </div>
              
              <div className="md:col-span-2 flex justify-end gap-3 pt-4">
                <button type="button" className="px-6 py-2.5 text-slate-400 font-bold hover:text-slate-600 transition-all text-sm" onClick={() => setShowModalEditar(false)}>
                  Cancelar
                </button>
                <button type="submit" className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-amber-600 transition-all shadow-lg active:scale-95 flex items-center gap-2 text-sm">
                  <IconSave width={16} /> Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Eliminar Profesor */}
      {showModalEliminar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setShowModalEliminar(false)}></div>
          <div className="bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl relative z-10 animate-zoom-in text-center">
            <div className="w-20 h-20 mx-auto bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500 text-3xl mb-6 shadow-lg shadow-rose-100">
              <IconAlert />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">¿Eliminar Profesor?</h3>
            <p className="text-slate-500 text-sm font-medium mb-8">
              Esta acción eliminará a <strong className="text-slate-800">{profesorActual.nombre} {profesorActual.apellido}</strong> de la nómina. No se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={handleEliminar} className="flex-1 py-4 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl transition-all shadow-lg shadow-rose-200 active:scale-95">
                Eliminar
              </button>
              <button onClick={() => setShowModalEliminar(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListaProfesores;