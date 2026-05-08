import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { 
  IconQrcode, IconPlus, IconDownload, IconTrash, 
  IconCancel, IconCheck, IconAlert, IconInfo, IconPower 
} from '../Icons/SystemIcons';

const ControlQRFijos = () => {
  const { user } = useAuth();
  const [qrs, setQrs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoQR, setNuevoQR] = useState({ nombre: '', codigo: '' });
  const [modalDesactivar, setModalDesactivar] = useState({
    mostrar: false,
    id_qr_fijo: null,
    nombre: ''
  });
  const [modalActivar, setModalActivar] = useState({
    mostrar: false,
    id_qr_fijo: null,
    nombre: ''
  });

  useEffect(() => {
    cargarQRsEstaticos();
  }, []);

  const cargarQRsEstaticos = async () => {
    try {
      setCargando(true);
      const response = await api.get('/qr/estaticos');
      if (response.data.success) {
        setQrs(response.data.qrs);
      }
    } catch (err) {
      console.error('Error cargando QRs estáticos:', err);
      setError('Error al cargar los códigos QR');
    } finally {
      setCargando(false);
    }
  };

  const descargarQR = (qr) => {
    const link = document.createElement('a');
    link.href = qr.imagen;
    link.download = `QR_${qr.nombre.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const mostrarModalDesactivar = (qr) => {
    setModalDesactivar({
      mostrar: true,
      id_qr_fijo: qr.id_qr_fijo,
      nombre: qr.nombre
    });
  };

  const cerrarModalDesactivar = () => {
    setModalDesactivar({
      mostrar: false,
      id_qr_fijo: null,
      nombre: ''
    });
  };

  const handleDesactivar = async () => {
    try {
      const response = await api.put(`/qr/fijos/${modalDesactivar.id_qr_fijo}/desactivar`);
      if (response.data.success) {
        setMensaje('✅ QR desactivado correctamente');
        cargarQRsEstaticos();
        cerrarModalDesactivar();
        setTimeout(() => setMensaje(''), 3000);
      }
    } catch (err) {
      console.error('Error desactivando QR:', err);
      setError('Error al desactivar el QR');
      cerrarModalDesactivar();
    }
  };

  const mostrarModalActivar = (qr) => {
    setModalActivar({
      mostrar: true,
      id_qr_fijo: qr.id_qr_fijo,
      nombre: qr.nombre
    });
  };

  const cerrarModalActivar = () => {
    setModalActivar({
      mostrar: false,
      id_qr_fijo: null,
      nombre: ''
    });
  };

  const handleActivar = async () => {
    try {
      const response = await api.put(`/qr/fijos/${modalActivar.id_qr_fijo}/activar`);
      if (response.data.success) {
        setMensaje('✅ QR activado correctamente');
        cargarQRsEstaticos();
        cerrarModalActivar();
        setTimeout(() => setMensaje(''), 3000);
      }
    } catch (err) {
      console.error('Error activando QR:', err);
      setError('Error al activar el QR');
      cerrarModalActivar();
    }
  };

  const crearQR = async (e) => {
    e.preventDefault();
    if (!nuevoQR.nombre || !nuevoQR.codigo) {
      setError('Nombre y código son requeridos');
      return;
    }
    try {
      const response = await api.post('/qr/fijos', nuevoQR);
      if (response.data.success) {
        setMensaje('✅ QR creado correctamente');
        setNuevoQR({ nombre: '', codigo: '' });
        setMostrarFormulario(false);
        cargarQRsEstaticos();
        setTimeout(() => setMensaje(''), 3000);
      }
    } catch (err) {
      console.error('Error creando QR:', err);
      setError(err.response?.data?.error || 'Error al crear el QR');
    }
  };

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-indigo-600">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <p className="font-medium animate-pulse">Cargando códigos QR fijos...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header Premium */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
            <IconQrcode />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Control de QR Fijos</h1>
            <p className="text-slate-500 font-medium tracking-tight">Códigos QR estáticos para coordinaciones IUJO</p>
          </div>
        </div>
        <button
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className={`px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-lg ${
            mostrarFormulario 
            ? "bg-slate-100 text-slate-600 hover:bg-slate-200" 
            : "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-200 active:scale-95"
          }`}
        >
          {mostrarFormulario ? <IconCancel /> : <IconPlus />}
          {mostrarFormulario ? 'Cancelar' : 'Agregar Nuevo QR'}
        </button>
      </div>

      {/* Alertas */}
      {mensaje && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-6 py-4 rounded-2xl flex items-center gap-3 animate-slide-in shadow-sm">
          <IconCheck /> <span className="font-bold">{mensaje}</span>
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 px-6 py-4 rounded-2xl flex items-center justify-between animate-shake shadow-sm">
          <div className="flex items-center gap-3">
             <IconAlert /> <span className="font-bold">{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600 font-black px-2">×</button>
        </div>
      )}

      {/* Formulario Nuevo QR */}
      {mostrarFormulario && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-100 animate-zoom-in relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-teal-600"></div>
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <IconPlus className="text-emerald-600" /> Nuevo Registro de Coordinación
          </h3>
          <form onSubmit={crearQR} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Nombre de la Coordinación</label>
              <input
                type="text"
                value={nuevoQR.nombre}
                onChange={(e) => setNuevoQR({ ...nuevoQR, nombre: e.target.value })}
                placeholder="Ej: Informática"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Código Identificador (Único)</label>
              <input
                type="text"
                value={nuevoQR.codigo}
                onChange={(e) => setNuevoQR({ ...nuevoQR, codigo: e.target.value })}
                placeholder="Ej: COORD_INF"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-mono"
              />
            </div>
            <div className="md:col-span-2 flex justify-end pt-2">
              <button type="submit" className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center gap-2">
                <IconCheck /> Crear Código Estático
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid de QRs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
        {qrs.map((qr) => (
          <div
            key={qr.id_qr_fijo}
            className={`bg-white rounded-[32px] p-6 shadow-sm border-2 transition-all hover:shadow-xl hover:-translate-y-1 ${
              qr.activo ? 'border-emerald-100' : 'border-rose-100 opacity-80'
            }`}
          >
            <div className="flex flex-col items-center">
              <div className="w-full text-center mb-4">
                <h3 className="text-lg font-black text-slate-800 truncate">{qr.nombre}</h3>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter mt-1 ${
                  qr.activo ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${qr.activo ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'}`}></span>
                  {qr.activo ? 'Activo' : 'Inactivo'}
                </div>
              </div>

              <div className="relative group p-4 bg-slate-50 rounded-[24px] mb-4 border border-slate-100">
                <img
                  src={qr.imagen}
                  alt={`QR ${qr.nombre}`}
                  className={`w-40 h-40 object-contain transition-all duration-500 ${qr.activo ? 'group-hover:scale-105' : 'grayscale brightness-90'}`}
                />
                {!qr.activo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px] rounded-[24px]">
                    <IconPower className="text-rose-500 w-10 h-10" />
                  </div>
                )}
              </div>

              <div className="w-full space-y-4">
                <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-center">
                  <code className="text-[10px] font-mono font-bold text-indigo-500 break-all">{qr.codigo}</code>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => descargarQR(qr)}
                    className="flex-1 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90 font-bold text-xs gap-1.5"
                  >
                    <IconDownload width={14} height={14} /> PNG
                  </button>
                  {qr.activo ? (
                    <button
                      onClick={() => mostrarModalDesactivar(qr)}
                      className="flex-1 h-11 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-90 font-bold text-xs gap-1.5"
                    >
                      <IconPower width={14} height={14} /> Apagar
                    </button>
                  ) : (
                    <button
                      onClick={() => mostrarModalActivar(qr)}
                      className="flex-1 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-90 font-bold text-xs gap-1.5"
                    >
                      <IconCheck width={14} height={14} /> Activar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Card Premium */}
      <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="flex items-start gap-4 relative z-10">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-indigo-200">
            <IconInfo />
          </div>
          <div>
            <h4 className="text-lg font-bold mb-3 tracking-wide">Directrices de Gestión de QRs</h4>
            <ul className="space-y-2.5 text-indigo-100 text-sm font-medium">
              <li className="flex items-center gap-2 opacity-90"><div className="w-1 h-1 bg-indigo-300 rounded-full"></div> Los QR inactivos no podrán ser procesados por la App de escaneo.</li>
              <li className="flex items-center gap-2 opacity-90"><div className="w-1 h-1 bg-indigo-300 rounded-full"></div> Los códigos identificadores deben ser únicos por coordinación.</li>
              <li className="flex items-center gap-2 opacity-90"><div className="w-1 h-1 bg-indigo-300 rounded-full"></div> El modo escala de grises indica visualmente que el punto de control está cerrado.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modales Premium */}
      {(modalDesactivar.mostrar || modalActivar.mostrar) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={modalDesactivar.mostrar ? cerrarModalDesactivar : cerrarModalActivar}></div>
          <div className="bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl relative z-10 animate-zoom-in text-center">
            <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center text-3xl mb-6 shadow-lg ${
              modalDesactivar.mostrar ? 'bg-rose-50 text-rose-500 shadow-rose-100' : 'bg-emerald-50 text-emerald-500 shadow-emerald-100'
            }`}>
              {modalDesactivar.mostrar ? <IconAlert /> : <IconCheck />}
            </div>
            
            <h3 className="text-xl font-black text-slate-800 mb-2">
              {modalDesactivar.mostrar ? '¿Desactivar QR?' : '¿Reactivar QR?'}
            </h3>
            <p className="text-slate-500 text-sm font-medium mb-8">
              Estás a punto de {modalDesactivar.mostrar ? 'desactivar' : 'activar'} el punto de control de <strong className="text-slate-800">{modalDesactivar.nombre || modalActivar.nombre}</strong>.
            </p>

            <div className="flex gap-3">
              <button
                onClick={modalDesactivar.mostrar ? handleDesactivar : handleActivar}
                className={`flex-1 py-4 rounded-2xl font-black text-white transition-all shadow-lg active:scale-95 ${
                  modalDesactivar.mostrar ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'
                }`}
              >
                Confirmar
              </button>
              <button
                onClick={modalDesactivar.mostrar ? cerrarModalDesactivar : cerrarModalActivar}
                className="flex-1 py-4 rounded-2xl font-black bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all active:scale-95"
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

export default ControlQRFijos;
