import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { 
  IconQrcode, IconPlus, IconDownload, IconEdit, 
  IconTrash, IconCancel, IconSave, IconAlert, IconInfo,
  IconCheck, IconClock, IconPower, IconX
} from '../Icons/SystemIcons';
import CustomSelect from '../UI/CustomSelect';

const AdministrarQR = () => {
  const { user } = useAuth();
  const [qrs, setQrs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  // Estados para el modal de edición
  const [modalEditar, setModalEditar] = useState({
    mostrar: false,
    id_qr: null,
    descripcion: '',
    ubicacion: '',
    horasExtension: 0
  });

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoQR, setNuevoQR] = useState({ 
    descripcion: '', 
    ubicacion: '',
    horasValidez: 2
  });

  // Estado para modal de confirmación de desactivación/activación
  const [modalConfirm, setModalConfirm] = useState({
    mostrar: false,
    tipo: '', // 'desactivar' o 'activar'
    id_qr: null
  });

  useEffect(() => {
    cargarQRs();
  }, []);

  const cargarQRs = async () => {
    try {
      setCargando(true);
      const response = await api.get('/qr/mis-qrs');
      setQrs(response.data);
    } catch (err) {
      console.error('Error cargando QRs:', err);
      setError('Error al cargar los códigos QR');
    } finally {
      setCargando(false);
    }
  };

  const generarQR = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/qr/generar', nuevoQR);
      if (response.data.success) {
        setMensaje('✅ QR generado exitosamente');
        setNuevoQR({ descripcion: '', ubicacion: '', horasValidez: 2 });
        setMostrarFormulario(false);
        cargarQRs();
        setTimeout(() => setMensaje(''), 3000);
      }
    } catch (err) {
      console.error('Error generando QR:', err);
      setError(err.response?.data?.error || 'Error al generar QR');
      setTimeout(() => setError(''), 3000);
    }
  };

  const abrirModalEditar = (qr) => {
    setModalEditar({
      mostrar: true,
      id_qr: qr.id_qr,
      descripcion: qr.descripcion || '',
      ubicacion: qr.ubicacion || '',
      horasExtension: 0
    });
  };

  const cerrarModalEditar = () => {
    setModalEditar({
      mostrar: false,
      id_qr: null,
      descripcion: '',
      ubicacion: '',
      horasExtension: 0
    });
  };

  const guardarEdicion = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put(`/qr/${modalEditar.id_qr}`, {
        descripcion: modalEditar.descripcion,
        ubicacion: modalEditar.ubicacion,
        horasExtension: modalEditar.horasExtension
      });
      if (response.data.success) {
        setMensaje('✅ QR actualizado correctamente');
        cerrarModalEditar();
        cargarQRs();
        setTimeout(() => setMensaje(''), 3000);
      }
    } catch (err) {
      console.error('Error editando QR:', err);
      setError(err.response?.data?.error || 'Error al editar QR');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleConfirmarAccion = async () => {
    const { tipo, id_qr } = modalConfirm;
    try {
      const endpoint = tipo === 'desactivar' ? `/qr/desactivar/${id_qr}` : `/qr/activar/${id_qr}`;
      const response = await api.put(endpoint);
      if (response.data.success) {
        setMensaje(`✅ QR ${tipo === 'desactivar' ? 'desactivado' : 'activado'} correctamente`);
        setModalConfirm({ mostrar: false, tipo: '', id_qr: null });
        cargarQRs();
        setTimeout(() => setMensaje(''), 3000);
      }
    } catch (err) {
      console.error(`Error al ${tipo} QR:`, err);
      setError(`Error al ${tipo} QR`);
      setModalConfirm({ mostrar: false, tipo: '', id_qr: null });
      setTimeout(() => setError(''), 3000);
    }
  };

  const desactivarQR = (id) => {
    setModalConfirm({ mostrar: true, tipo: 'desactivar', id_qr: id });
  };

  const activarQR = (id) => {
    setModalConfirm({ mostrar: true, tipo: 'activar', id_qr: id });
  };

  const descargarQR = (qr) => {
    const link = document.createElement('a');
    link.href = qr.imagen; // El backend ahora devuelve la imagen en base64
    link.download = `QR_${qr.codigo_qr}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-indigo-600">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <p className="font-medium animate-pulse">Cargando tus códigos QR...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header Premium */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
            <IconQrcode />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Administrar mis QR</h1>
            <p className="text-slate-500 font-medium tracking-tight">Códigos de sesión con validez limitada (2 horas)</p>
          </div>
        </div>
        <div className="flex gap-3">

          <button
            className={`px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-lg ${
              mostrarFormulario 
              ? "bg-slate-100 text-slate-600 hover:bg-slate-200" 
              : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200 active:scale-95"
            }`}
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
          >
            {mostrarFormulario ? <IconCancel /> : <IconPlus />}
            {mostrarFormulario ? 'Cancelar' : 'Generar Nuevo QR'}
          </button>
        </div>
      </div>

      {/* Alertas */}
      {mensaje && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-6 py-4 rounded-2xl flex items-center gap-3 animate-slide-in">
          <IconCheck /> <span className="font-medium">{mensaje}</span>
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 px-6 py-4 rounded-2xl flex items-center gap-3 animate-shake">
          <IconAlert /> <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Modal para generar nuevo QR */}
      {mostrarFormulario && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setMostrarFormulario(false)}></div>
          <div className="bg-white rounded-[24px] w-full max-w-2xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.1)] relative z-10 animate-zoom-in overflow-visible border-none outline-none">
             <div className="flex items-center gap-4 mb-8">
               <div className="text-indigo-600 text-2xl">
                 <IconPlus />
               </div>
               <div>
                 <h3 className="text-xl font-black text-slate-800 leading-none">Generar Nuevo QR</h3>
                 <p className="text-slate-400 text-[11px] font-medium mt-1 uppercase tracking-wider">Crea un punto de control de asistencia</p>
               </div>
             </div>

             <button onClick={() => setMostrarFormulario(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-600 transition-colors">
               <IconX />
             </button>

            <form onSubmit={generarQR} className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 overflow-visible">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Tiempo de Validez</label>
                <CustomSelect
                  options={[
                    { value: 1, label: '1 Hora' },
                    { value: 2, label: '2 Horas (Recomendado)' },
                    { value: 4, label: '4 Horas' },
                    { value: 8, label: '8 Horas' },
                    { value: 12, label: '12 Horas' },
                    { value: 24, label: '24 Horas (1 Día)' },
                  ]}
                  value={nuevoQR.horasValidez}
                  onChange={(val) => setNuevoQR({ ...nuevoQR, horasValidez: val })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Descripción</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                  value={nuevoQR.descripcion}
                  onChange={(e) => setNuevoQR({ ...nuevoQR, descripcion: e.target.value })}
                  placeholder="Descripción..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Ubicación</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                  value={nuevoQR.ubicacion}
                  onChange={(e) => setNuevoQR({ ...nuevoQR, ubicacion: e.target.value })}
                  placeholder="Ubicación..."
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 pt-4">
                <button type="button" className="px-6 py-2.5 text-slate-400 font-bold hover:text-slate-600 transition-all text-sm" onClick={() => setMostrarFormulario(false)}>
                  Cancelar
                </button>
                <button type="submit" className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-indigo-600 transition-all shadow-lg active:scale-95 flex items-center gap-2 text-sm">
                  <IconSave width={16} /> Crear Código QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grid de QR existentes */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800">Mis Códigos QR</h3>
          <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full">
            {qrs.length} Registrados
          </span>
        </div>
        
        {qrs.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 text-5xl mb-6 border-4 border-white shadow-inner">
              <IconQrcode />
            </div>
            <h4 className="text-xl font-bold text-slate-700 mb-2">No tienes códigos generados</h4>
            <p className="text-slate-500 max-w-xs mx-auto">
              Crea tu primer código QR para que los profesores puedan registrar su asistencia.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/30 text-slate-500 text-xs uppercase tracking-wider text-left border-b border-slate-100">
                  <th className="px-6 py-4 font-bold">Vista Previa</th>
                  <th className="px-6 py-4 font-bold">Información</th>
                  <th className="px-6 py-4 font-bold">Estado / Validez</th>
                  <th className="px-6 py-4 font-bold">Creado</th>
                  <th className="px-6 py-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {qrs.map((qr) => (
                  <tr key={qr.id_qr} className={`group hover:bg-slate-50/50 transition-colors ${!qr.activo ? 'opacity-60 bg-slate-50/50' : ''}`}>
                    <td className="px-6 py-5">
                      <div className="relative w-16 h-16 bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm group-hover:scale-110 transition-transform cursor-zoom-in overflow-hidden flex items-center justify-center">
                        {qr.imagen || qr.imagen_qr ? (
                          <img
                            src={qr.imagen || qr.imagen_qr}
                            alt={`QR ${qr.codigo_qr}`}
                            className="w-full h-full object-contain"
                            crossOrigin="anonymous"
                            loading="lazy"
                            onError={(e) => {
                              console.error("Error cargando imagen QR para:", qr.codigo_qr);
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-indigo-400 gap-1"
                          style={{ display: (qr.imagen || qr.imagen_qr) ? 'none' : 'flex' }}
                        >
                          <IconQrcode width={24} height={24} />
                          <span className="text-[8px] font-bold">ERROR</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-slate-800 mb-1">{qr.descripcion || 'Sin descripción'}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <IconInfo width={12} height={12} className="text-indigo-400" />
                        {qr.ubicacion || 'Ubicación no especificada'}
                      </div>
                      <code className="mt-2 block text-[10px] text-indigo-500 font-mono bg-indigo-50 w-fit px-2 py-0.5 rounded border border-indigo-100">
                        {qr.codigo_qr}
                      </code>
                    </td>
                    <td className="px-6 py-5 text-sm">
                      <div className="flex flex-col gap-2">
                        {qr.activo ? (
                          <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg w-fit">
                            Vigente
                          </span>
                        ) : (
                          <span className="bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg w-fit">
                            Expirado / Inactivo
                          </span>
                        )}
                        {qr.fecha_expiracion && (
                          <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                            <IconClock width={10} height={10} />
                            Expira: {new Date(qr.fecha_expiracion).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-500">
                      {new Date(qr.fecha_creacion).toLocaleDateString('es-VE')}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-2">
                        <button 
                          className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90" 
                          onClick={() => descargarQR(qr)}
                          title="Descargar imagen"
                        >
                          <IconDownload />
                        </button>
                        <button 
                          className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center hover:bg-amber-600 hover:text-white transition-all shadow-sm active:scale-90" 
                          onClick={() => abrirModalEditar(qr)}
                          title="Editar información"
                        >
                          <IconEdit />
                        </button>
                        {qr.activo ? (
                          <button 
                            className="w-9 h-9 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-90" 
                            onClick={() => desactivarQR(qr.id_qr)}
                            title="Desactivar"
                          >
                            <IconPower width={18} height={18} />
                          </button>
                        ) : (
                          <button 
                            className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-90" 
                            onClick={() => activarQR(qr.id_qr)}
                            title="Activar"
                          >
                            <IconCheck width={18} height={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de edición Premium */}
      {modalEditar.mostrar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={cerrarModalEditar}></div>
          <div className="bg-white rounded-[24px] w-full max-w-2xl p-6 shadow-2xl relative z-10 animate-zoom-in">

              <div className="flex items-center gap-4 mb-8">
                <div className="text-indigo-600 text-2xl">
                  <IconEdit />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 leading-none">Editar QR</h3>
                  <p className="text-slate-400 text-xs font-medium mt-1">Actualiza los datos del punto de control</p>
                </div>
              </div>

             <button onClick={cerrarModalEditar} className="absolute top-6 right-6 text-slate-300 hover:text-slate-600 transition-colors">
               <IconX />
             </button>

            <form onSubmit={guardarEdicion} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Extender Tiempo</label>
                <CustomSelect
                  options={[
                    { value: 0, label: 'No extender' },
                    { value: 1, label: '+1 Hora' },
                    { value: 2, label: '+2 Horas' },
                    { value: 4, label: '+4 Horas' },
                    { value: 8, label: '+8 Horas' },
                    { value: 24, label: '+24 Horas' },
                  ]}
                  value={modalEditar.horasExtension}
                  onChange={(val) => setModalEditar({ ...modalEditar, horasExtension: val })}
                  placeholder="Extender validez"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Descripción</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                  value={modalEditar.descripcion}
                  onChange={(e) => setModalEditar({ ...modalEditar, descripcion: e.target.value })}
                  placeholder="Descripción..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Ubicación</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                  value={modalEditar.ubicacion}
                  onChange={(e) => setModalEditar({ ...modalEditar, ubicacion: e.target.value })}
                  placeholder="Ubicación..."
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 pt-4">
                <button type="button" className="px-6 py-2.5 text-slate-400 font-bold hover:text-slate-600 transition-all text-sm" onClick={cerrarModalEditar}>
                  Cancelar
                </button>
                <button type="submit" className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-indigo-600 transition-all shadow-lg active:scale-95 flex items-center gap-2 text-sm">
                  <IconSave width={16} /> Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Acción (Desactivar/Activar) */}
      {modalConfirm.mostrar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setModalConfirm({ mostrar: false, tipo: '', id_qr: null })}></div>
          <div className="bg-white rounded-[40px] w-full max-w-md p-10 shadow-2xl relative z-10 animate-zoom-in text-center">
            <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center text-4xl shadow-2xl mx-auto mb-8 border-4 border-white ${
              modalConfirm.tipo === 'desactivar' ? 'bg-rose-500 text-white shadow-rose-200' : 'bg-emerald-500 text-white shadow-emerald-200'
            }`}>
              {modalConfirm.tipo === 'desactivar' ? <IconPower /> : <IconCheck />}
            </div>
            
            <h3 className="text-2xl font-black text-slate-800 mb-2 capitalize">¿{modalConfirm.tipo} QR?</h3>
            <p className="text-slate-500 font-medium mb-8">
              {modalConfirm.tipo === 'desactivar' 
                ? 'El código dejará de ser válido para escaneos inmediatamente.' 
                : 'El código volverá a estar disponible para el registro de asistencias.'}
            </p>

            <div className="flex gap-3">
              <button 
                onClick={handleConfirmarAccion}
                className={`flex-1 py-4 rounded-2xl font-black transition-all shadow-xl active:scale-95 text-white ${
                  modalConfirm.tipo === 'desactivar' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-100' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100'
                }`}
              >
                Confirmar
              </button>
              <button 
                onClick={() => setModalConfirm({ mostrar: false, tipo: '', id_qr: null })} 
                className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdministrarQR;
