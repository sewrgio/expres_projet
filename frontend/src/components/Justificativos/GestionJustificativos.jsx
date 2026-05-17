import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import CustomSelect from '../UI/CustomSelect';
import { 
  IconClipboard, IconPlus, IconCheck, IconAlert, 
  IconDownload, IconSearch, IconInfo, IconChevronRight,
  IconClock, IconTrash, IconCancel, IconSave, IconEye,
  IconUser, IconGraduation, IconBookOpen, IconX
} from '../Icons/SystemIcons';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

const GestionJustificativos = ({ esVistaProfesores = false }) => {
  const { user } = useAuth();
  const [justificativos, setJustificativos] = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [archivo, setArchivo] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  
  // Filtros y Reportes
  const [tipoReporte, setTipoReporte] = useState('semanal');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [terminoBusquedaTabla, setTerminoBusquedaTabla] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [buscando, setBuscando] = useState(false);

  const [formData, setFormData] = useState({
    id_asistencia: '',
    documento_url: ''
  });

  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [modalDocumento, setModalDocumento] = useState({ mostrar: false, url: '', tipo: '' });
  const [modalRechazo, setModalRechazo] = useState({ mostrar: false, id_justificativo: null, observaciones: '' });

  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      const res = await api.get(esVistaProfesores ? '/justificativos/todos' : '/justificativos');
      setJustificativos(res.data);
      
      if (esVistaProfesores) {
        const profRes = await api.get('/profesores/todos');
        setProfesores(profRes.data);
      }
    } catch (error) {
      console.error(error);
      setError('Error al cargar justificativos');
    } finally {
      setCargando(false);
    }
  }, [esVistaProfesores]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const buscarProfesorBD = async (query) => {
    if (query.length < 2) {
      setResultadosBusqueda([]);
      return;
    }
    setBuscando(true);
    try {
      const res = await api.get(`/profesores/buscar?q=${query}`);
      setResultadosBusqueda(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setBuscando(false);
    }
  };

  const buscarAsistenciasProfesor = async (prof) => {
    try {
      const res = await api.get(`/asistencias/profesor/${prof.id_profesor}`);
      setAsistencias(res.data);
    } catch (err) {
      console.error(err);
      setError('Error al cargar asistencias del profesor');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.id_asistencia) {
      setError('Debe seleccionar una asistencia para justificar');
      return;
    }
    try {
      const data = new FormData();
      data.append('id_asistencia', formData.id_asistencia);
      if (archivo) {
        data.append('documento', archivo);
      }
      await api.post('/justificativos', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMensaje('✅ Solicitud enviada correctamente');
      setFormData({ id_asistencia: '', documento_url: '' });
      setArchivo(null);
      setMostrarForm(false);
      cargarDatos();
      setTimeout(() => setMensaje(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Error al enviar el justificativo');
    }
  };

  const handleAprobar = async (id) => {
    try {
      await api.put(`/justificativos/aprobar/${id}`);
      setMensaje('✅ Justificativo aprobado');
      cargarDatos();
      setTimeout(() => setMensaje(''), 3000);
    } catch (error) {
      setError('Error al aprobar');
    }
  };

  const handleRechazar = async () => {
    const { id_justificativo, observaciones } = modalRechazo;
    if (!observaciones.trim()) {
      setError('Debe indicar un motivo para el rechazo');
      return;
    }
    try {
      await api.put(`/justificativos/rechazar/${id_justificativo}`, { observaciones });
      setMensaje('❌ Justificativo rechazado');
      setModalRechazo({ mostrar: false, id_justificativo: null, observaciones: '' });
      cargarDatos();
      setTimeout(() => setMensaje(''), 3000);
    } catch (error) {
      setError('Error al rechazar');
    }
  };

  const verDocumento = (url) => {
    if (!url) return;
    const fullUrl = url.startsWith('http') ? url : `${api.defaults.baseURL.replace('/api', '')}${url}`;
    const tipo = url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';
    setModalDocumento({ mostrar: true, url: fullUrl, tipo });
  };

  const generarPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.setTextColor(0, 51, 102);
      doc.text("Reporte de Justificativos", 14, 22);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Institución: IUJO`, 14, 30);
      doc.text(`Generado por: ${user.nombre} ${user.apellido}`, 14, 35);
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 40);

      const tableColumn = ["Profesor", "Cédula", "Carrera", "Fecha Solicitud", "Asignatura", "Estado"];
      const tableRows = justificativos
        .filter(j => {
          if (!fechaInicio || !fechaFin) return true;
          const fechaJ = new Date(j.fecha_solicitud);
          return fechaJ >= new Date(fechaInicio) && fechaJ <= new Date(fechaFin);
        })
        .map(j => [
          `${j.nombre} ${j.apellido}`,
          j.cedula || 'N/A',
          j.nombre_carrera || 'N/A',
          new Date(j.fecha_solicitud).toLocaleDateString(),
          j.nombre_asignatura || 'N/A',
          j.estado.toUpperCase()
        ]);

      autoTable(doc, { 
        head: [tableColumn], 
        body: tableRows, 
        startY: 50,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [63, 81, 181] }
      });
      doc.save(`justificativos_${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error(err);
      setError('Error generando PDF');
    }
  };

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-indigo-600">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <p className="font-medium animate-pulse">Procesando información de justificativos...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      {/* Header Premium */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100 text-2xl">
            <IconClipboard />
          </div>
          <div role="status" aria-live="polite" className="sr-only">
            {esVistaProfesores ? 'Vista de Control de Justificativos' : 'Vista de Mis Justificativos'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800" id="page-title">
              {esVistaProfesores ? 'Control de Justificativos' : 'Mis Justificativos'}
            </h1>
            <p className="text-slate-500 font-medium">Gestión de inasistencias y soportes documentales</p>
          </div>
        </div>
        
        {esVistaProfesores && (
          <button 
            onClick={generarPDF}
            className="bg-white text-indigo-600 border-2 border-indigo-100 px-6 py-3 rounded-2xl font-bold hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-sm active:scale-95 focus:ring-4 focus:ring-indigo-500/20 outline-none"
            aria-label="Exportar todos los justificativos a formato PDF"
          >
            <IconDownload aria-hidden="true" /> Exportar Reporte PDF
          </button>
        )}

        {!esVistaProfesores && !mostrarForm && (
          <button 
            onClick={() => {
              setMostrarForm(true);
              const miProf = profesores.find(p => p.id_usuario === user.id_usuario) || { id_profesor: user.id_profesor };
              if (miProf.id_profesor) buscarAsistenciasProfesor(miProf);
            }}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg active:scale-95 focus:ring-4 focus:ring-indigo-500/40 outline-none"
            aria-label="Crear una nueva solicitud de justificativo"
          >
            <IconPlus aria-hidden="true" /> Solicitar Justificativo
          </button>
        )}
      </div>

      {/* Alertas */}
      {(mensaje || error) && (
        <div className="space-y-3" role="alert" aria-live="assertive">
          {mensaje && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-6 py-4 rounded-2xl flex items-center gap-3 animate-slide-in shadow-sm">
              <IconCheck aria-hidden="true" /> <span className="font-bold">{mensaje}</span>
            </div>
          )}
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 px-6 py-4 rounded-2xl flex items-center gap-3 animate-shake shadow-sm">
              <IconAlert aria-hidden="true" /> <span className="font-bold">{error}</span>
            </div>
          )}
        </div>
      )}

      {/* Formulario de Solicitud (Solo Profesor) */}
      {!esVistaProfesores && mostrarForm && (
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 animate-zoom-in">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-black text-slate-800" id="form-title">Nueva Solicitud de Justificativo</h2>
            <button 
              onClick={() => setMostrarForm(false)} 
              className="text-slate-400 hover:text-slate-600 bg-slate-50 w-10 h-10 rounded-full flex items-center justify-center focus:ring-4 focus:ring-slate-200 outline-none"
              aria-label="Cerrar formulario de solicitud"
            >
              <IconCancel aria-hidden="true" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1" htmlFor="select-asistencia">Seleccionar Asistencia</label>
                <CustomSelect
                  id="select-asistencia"
                  options={asistencias.map(a => ({ 
                    value: a.id_asistencia, 
                    label: `${new Date(a.fecha_entrada).toLocaleDateString()} - ${a.nombre_asignatura || 'Sin Asignatura'}` 
                  }))}
                  value={formData.id_asistencia}
                  onChange={(val) => setFormData({ ...formData, id_asistencia: val })}
                  placeholder="Elegir fecha de inasistencia..."
                />
              </div>
              
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-800 text-xs font-medium flex items-center gap-3">
                <IconInfo className="flex-shrink-0" />
                Solo se muestran asistencias registradas en los últimos 30 días.
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-bold text-slate-700 ml-1" htmlFor="file-upload">Soporte Documental (PDF o Imagen)</label>
              <div className="relative group">
                <input 
                  type="file" 
                  id="file-upload" 
                  className="hidden" 
                  accept=".jpg,.jpeg,.png,.pdf" 
                  onChange={(e) => setArchivo(e.target.files[0])} 
                />
                <label 
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center w-full h-40 border-4 border-dashed border-slate-100 bg-slate-50 rounded-[32px] cursor-pointer group-hover:border-indigo-200 group-hover:bg-indigo-50 transition-all overflow-hidden focus-within:ring-4 focus-within:ring-indigo-500/20"
                  aria-label="Subir soporte documental, solo se permiten archivos PDF o imágenes"
                >
                  {archivo ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="text-3xl" aria-hidden="true">📄</div>
                      <span className="text-indigo-600 font-bold text-center px-4 truncate max-w-full">{archivo.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-indigo-400 transition-colors">
                      <div className="text-4xl" aria-hidden="true">📤</div>
                      <span className="font-black text-xs uppercase tracking-widest">Subir Archivo</span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end gap-3 pt-4">
              <button type="submit" className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all flex items-center gap-2 active:scale-95 focus:ring-4 focus:ring-indigo-500/40 outline-none" aria-label="Enviar solicitud de justificativo">
                <IconSave aria-hidden="true" /> Enviar Solicitud
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros de Tabla (Vista Coordinador) */}
      {esVistaProfesores && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2 w-full">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1" htmlFor="search-profesor">Buscar Profesor</label>
            <div className="relative group">
              <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" aria-hidden="true" />
              <input
                id="search-profesor"
                type="text"
                placeholder="Nombre, cédula o asignatura..."
                className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold"
                value={terminoBusquedaTabla}
                onChange={(e) => setTerminoBusquedaTabla(e.target.value)}
                aria-label="Buscar por nombre, cédula o asignatura"
              />
            </div>
          </div>
          <div className="w-full md:w-48 space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1" htmlFor="fecha-inicio">Desde</label>
            <input 
              id="fecha-inicio"
              type="date" 
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500" 
              value={fechaInicio} 
              onChange={(e) => setFechaInicio(e.target.value)} 
              aria-label="Fecha de inicio para filtrar"
            />
          </div>
          <div className="w-full md:w-48 space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1" htmlFor="fecha-fin">Hasta</label>
            <input 
              id="fecha-fin"
              type="date" 
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500" 
              value={fechaFin} 
              onChange={(e) => setFechaFin(e.target.value)} 
              aria-label="Fecha de fin para filtrar"
            />
          </div>
        </div>
      )}

      {/* Tabla Principal */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Fecha</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Profesor</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Asignatura</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Estado</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {justificativos
                .filter(j => {
                  const term = terminoBusquedaTabla.toLowerCase();
                  const matchesTerm = !terminoBusquedaTabla || 
                    `${j.nombre} ${j.apellido}`.toLowerCase().includes(term) ||
                    (j.nombre_asignatura && j.nombre_asignatura.toLowerCase().includes(term)) ||
                    (j.cedula && j.cedula.includes(term));
                  
                  if (!fechaInicio || !fechaFin) return matchesTerm;
                  const date = new Date(j.fecha_solicitud);
                  return matchesTerm && date >= new Date(fechaInicio) && date <= new Date(fechaFin);
                })
                .map((j) => (
                  <tr key={j.id_justificativo} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="font-bold text-slate-800">{new Date(j.fecha_solicitud).toLocaleDateString()}</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {new Date(j.fecha_solicitud).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-slate-800">{j.nombre} {j.apellido}</div>
                      <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{j.cedula}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-slate-600 text-sm">{j.nombre_asignatura || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        j.estado === 'aprobado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        j.estado === 'rechazado' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                        {j.estado}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        {j.documento_url && (
                          <button 
                            onClick={() => verDocumento(j.documento_url)}
                            className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm focus:ring-4 focus:ring-indigo-500/20 outline-none"
                            aria-label={`Ver documento de soporte para ${j.nombre} ${j.apellido}`}
                            title="Ver Documento"
                          >
                            <IconEye aria-hidden="true" />
                          </button>
                        )}
                        {esVistaProfesores && j.estado === 'pendiente' && (
                          <>
                            <button 
                              onClick={() => handleAprobar(j.id_justificativo)}
                              className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm focus:ring-4 focus:ring-emerald-500/20 outline-none"
                              aria-label={`Aprobar justificativo de ${j.nombre} ${j.apellido}`}
                              title="Aprobar"
                            >
                              <IconCheck aria-hidden="true" />
                            </button>
                            <button 
                              onClick={() => setModalRechazo({ mostrar: true, id_justificativo: j.id_justificativo, observaciones: '' })}
                              className="w-9 h-9 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm focus:ring-4 focus:ring-rose-500/20 outline-none"
                              aria-label={`Rechazar justificativo de ${j.nombre} ${j.apellido}`}
                              title="Rechazar"
                            >
                              <IconTrash aria-hidden="true" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {justificativos.length === 0 && (
            <div className="p-20 text-center text-slate-400 font-medium bg-slate-50/30">
              No se encontraron registros de justificativos
            </div>
          )}
        </div>
      </div>

      {/* Modal Visualizar Documento */}
      {modalDocumento.mostrar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-labelledby="modal-doc-title" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-fade-in" onClick={() => setModalDocumento({ ...modalDocumento, mostrar: false })}></div>
          <div className="bg-white rounded-[40px] w-full max-w-4xl h-[85vh] shadow-2xl relative z-10 animate-zoom-in overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-3" id="modal-doc-title">
                <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
                  <IconEye aria-hidden="true" />
                </div>
                Visualización de Soporte
              </h3>
              <button 
                onClick={() => setModalDocumento({ ...modalDocumento, mostrar: false })} 
                className="text-slate-400 hover:text-slate-600 bg-white w-10 h-10 rounded-full flex items-center justify-center shadow-sm focus:ring-4 focus:ring-slate-100 outline-none"
                aria-label="Cerrar vista de documento"
              >
                <IconCancel aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 bg-slate-200 overflow-auto p-4 flex items-center justify-center">
              {modalDocumento.tipo === 'pdf' ? (
                <iframe src={modalDocumento.url} className="w-full h-full rounded-2xl shadow-lg bg-white" title="Vista previa del documento soporte PDF" />
              ) : (
                <img src={modalDocumento.url} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" alt="Imagen del soporte justificativo" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Rechazar Justificativo (Personalizado) */}
      {modalRechazo.mostrar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-labelledby="modal-rechazo-title" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setModalRechazo({ mostrar: false, id_justificativo: null, observaciones: '' })}></div>
          <div className="bg-white rounded-[40px] w-full max-w-md p-10 shadow-2xl relative z-10 animate-zoom-in">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[24px] flex items-center justify-center text-3xl mx-auto mb-6 shadow-lg shadow-rose-100">
                <IconAlert aria-hidden="true" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2" id="modal-rechazo-title">Rechazar Solicitud</h3>
              <p className="text-slate-500 font-medium">Por favor, indica el motivo del rechazo para informar al docente.</p>
            </div>
            
            <label htmlFor="rechazo-observaciones" className="sr-only">Motivo del rechazo</label>
            <textarea
              id="rechazo-observaciones"
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all font-medium text-slate-700 min-h-[120px] mb-8"
              placeholder="Ej: Documento ilegible o fecha incorrecta..."
              value={modalRechazo.observaciones}
              onChange={(e) => setModalRechazo({ ...modalRechazo, observaciones: e.target.value })}
              aria-required="true"
            />

            <div className="flex gap-3">
              <button 
                onClick={handleRechazar}
                className="flex-1 bg-rose-500 text-white py-4 rounded-2xl font-black hover:bg-rose-600 transition-all shadow-xl shadow-rose-200 active:scale-95 focus:ring-4 focus:ring-rose-500/40 outline-none"
                aria-label="Confirmar el rechazo del justificativo"
              >
                Confirmar Rechazo
              </button>
              <button 
                onClick={() => setModalRechazo({ mostrar: false, id_justificativo: null, observaciones: '' })} 
                className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all focus:ring-4 focus:ring-slate-200 outline-none"
                aria-label="Cancelar y volver"
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

export default GestionJustificativos;