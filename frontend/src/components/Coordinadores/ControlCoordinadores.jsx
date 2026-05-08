import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  IconUsers, IconEdit, IconGraduation, IconSave, IconCancel,
  IconEmail, IconPhone, IconIdCard, IconAlert, IconCheck, IconPower,
  IconSearch, IconPlus, IconChevronRight
} from '../Icons/SystemIcons';
import CustomSelect from '../UI/CustomSelect';

const ControlCoordinadores = () => {
  const [coordinadores, setCoordinadores] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    correo: '',
    telefono: '',
    id_carrera: ''
  });

  const [modalConfirm, setModalConfirm] = useState({ mostrar: false, tipo: '', data: null });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [coordsRes, carrerasRes] = await Promise.all([
        api.get('/coordinadores'),
        api.get('/carreras')
      ]);
      setCoordinadores(coordsRes.data);
      setCarreras(carrerasRes.data);
    } catch (err) {
      console.error(err);
      setError('Error al cargar datos');
    } finally {
      setCargando(false);
    }
  };

  const handleEditar = (coord) => {
    setEditando(coord.id_coordinador);
    setFormData({
      nombre: coord.nombre || '',
      apellido: coord.apellido || '',
      correo: coord.correo || '',
      telefono: coord.telefono || '',
      id_carrera: coord.id_carrera || ''
    });
  };

  const handleConfirmarGuardar = async () => {
    try {
      const coord = coordinadores.find(c => c.id_coordinador === editando);
      await api.put(`/coordinadores/${editando}`, { id_carrera: formData.id_carrera });
      await api.put(`/usuarios/${coord.id_usuario}`, {
        nombre: formData.nombre,
        apellido: formData.apellido,
        correo: formData.correo,
        telefono: formData.telefono
      });
      setMensaje('✅ Coordinador actualizado');
      setEditando(null);
      setModalConfirm({ mostrar: false });
      cargarDatos();
      setTimeout(() => setMensaje(''), 3000);
    } catch (err) {
      setError('Error al actualizar');
    }
  };

  const handleToggleEstado = async () => {
    const { tipo, data: coord } = modalConfirm;
    const action = tipo === 'desactivar' ? 'desactivar' : 'activar';
    try {
      await api.put(`/coordinadores/${coord.id_coordinador}/${action}`);
      setMensaje(`✅ Coordinador ${tipo}o correctamente`);
      setModalConfirm({ mostrar: false });
      cargarDatos();
      setTimeout(() => setMensaje(''), 3000);
    } catch (err) {
      setError('Error al cambiar estado');
    }
  };

  const coordinadoresFiltrados = coordinadores.filter(c => 
    `${c.nombre} ${c.apellido}`.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.cedula?.includes(busqueda)
  );

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-indigo-600">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <p className="font-medium animate-pulse">Cargando gestión de coordinadores...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      {/* Header Premium */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100 text-2xl">
            <IconUsers />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Control de Coordinadores</h1>
            <p className="text-slate-500 font-medium">Administración de accesos y asignaciones de carrera</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="bg-emerald-50 px-4 py-2 rounded-xl text-emerald-600 font-bold text-xs uppercase border border-emerald-100">
            {coordinadores.filter(c => c.usuario_activo).length} Activos
          </div>
          <div className="bg-rose-50 px-4 py-2 rounded-xl text-rose-600 font-bold text-xs uppercase border border-rose-100">
            {coordinadores.filter(c => !c.usuario_activo).length} Inactivos
          </div>
        </div>
      </div>

      {/* Alertas y Buscador */}
      <div className="flex flex-col gap-4">
        {(mensaje || error) && (
          <div className={`px-6 py-4 rounded-2xl flex items-center gap-3 animate-slide-in shadow-sm border ${mensaje ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
            {mensaje ? <IconCheck /> : <IconAlert />}
            <span className="font-bold">{mensaje || error}</span>
          </div>
        )}

        <div className="relative group">
          <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
          <input
            type="text"
            placeholder="Buscar por nombre, apellido o cédula..."
            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm font-medium"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      {/* Grid de Coordinadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {coordinadoresFiltrados.map(coord => (
          <div key={coord.id_coordinador} className={`bg-white rounded-[32px] p-8 shadow-sm border transition-all hover:shadow-xl group relative overflow-hidden ${!coord.usuario_activo ? 'border-rose-100' : 'border-slate-100'}`}>
            {!coord.usuario_activo && <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">Inactivo</div>}
            
            <div className="flex items-center gap-5 mb-8">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner border border-white ${coord.usuario_activo ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                {coord.nombre[0]}{coord.apellido[0]}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 leading-tight">{coord.nombre} {coord.apellido}</h3>
                <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mt-1 flex items-center gap-1">
                  <IconGraduation width={12} height={12} /> {coord.nombre_carrera}
                </p>
              </div>
            </div>

            {editando === coord.id_coordinador ? (
              <div className="space-y-4 animate-slide-in">
                <input className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-sm" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} placeholder="Nombre" />
                <input className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-sm" value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} placeholder="Apellido" />
                <CustomSelect
                  options={carreras.map(c => ({ value: c.id_carrera, label: c.nombre_carrera }))}
                  value={formData.id_carrera}
                  onChange={val => setFormData({...formData, id_carrera: val })}
                />
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setModalConfirm({ mostrar: true, tipo: 'guardar', data: coord })} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all">Guardar</button>
                  <button onClick={() => setEditando(null)} className="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
                    <IconIdCard width={18} height={18} className="text-slate-300" /> {coord.cedula}
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 text-sm font-medium truncate">
                    <IconEmail width={18} height={18} className="text-slate-300" /> {coord.correo}
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
                    <IconPhone width={18} height={18} className="text-slate-300" /> {coord.telefono || 'Sin teléfono'}
                  </div>
                </div>

                <div className="flex gap-2 pt-6 border-t border-slate-50">
                  <button onClick={() => handleEditar(coord)} className="flex-1 bg-indigo-50 text-indigo-600 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2">
                    <IconEdit width={14} /> Editar
                  </button>
                  <button 
                    onClick={() => setModalConfirm({ mostrar: true, tipo: coord.usuario_activo ? 'desactivar' : 'activar', data: coord })}
                    className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${coord.usuario_activo ? 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
                  >
                    <IconPower width={14} /> {coord.usuario_activo ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* MODAL DE CONFIRMACIÓN PREMIUM */}
      {modalConfirm.mostrar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setModalConfirm({ mostrar: false })}></div>
          <div className="bg-white rounded-[40px] w-full max-w-md p-10 shadow-2xl relative z-10 animate-zoom-in text-center">
            <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center text-4xl shadow-2xl mx-auto mb-8 border-4 border-white ${
              modalConfirm.tipo === 'desactivar' ? 'bg-rose-500 text-white shadow-rose-200' :
              modalConfirm.tipo === 'activar' ? 'bg-emerald-500 text-white shadow-emerald-200' :
              'bg-indigo-600 text-white shadow-indigo-200'
            }`}>
              {modalConfirm.tipo === 'desactivar' ? <IconPower /> : modalConfirm.tipo === 'activar' ? <IconCheck /> : <IconSave />}
            </div>
            
            <h3 className="text-2xl font-black text-slate-800 mb-2 capitalize">¿{modalConfirm.tipo} Coordinador?</h3>
            <p className="text-slate-500 font-medium mb-8">
              ¿Estás seguro de realizar esta acción para <strong className="text-slate-800">{modalConfirm.data?.nombre} {modalConfirm.data?.apellido}</strong>?
            </p>

            <div className="flex gap-3">
              <button 
                onClick={modalConfirm.tipo === 'guardar' ? handleConfirmarGuardar : handleToggleEstado}
                className={`flex-1 py-4 rounded-2xl font-black transition-all shadow-xl active:scale-95 text-white ${
                  modalConfirm.tipo === 'desactivar' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-100' :
                  modalConfirm.tipo === 'activar' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100' :
                  'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
                }`}
              >
                Confirmar
              </button>
              <button onClick={() => setModalConfirm({ mostrar: false })} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlCoordinadores;
