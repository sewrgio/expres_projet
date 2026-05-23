import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  IconClipboard, IconCheck, IconAlert,
  IconDownload, IconSearch, IconEye, IconCancel
} from '../Icons/SystemIcons';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { addLogoHeader, addWatermark } from '../../utils/pdfHelper';

const JustificativosCoordinadores = () => {
  const { user } = useAuth();
  const [justificativos, setJustificativos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [modalDocumento, setModalDocumento] = useState({ mostrar: false, url: '', tipo: '' });
  const [modalRechazo, setModalRechazo] = useState({ mostrar: false, id_justificativo: null, observaciones: '' });

  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      const res = await api.get('/justificativos/todos');
      setJustificativos(res.data);
    } catch (err) {
      console.error(err);
      setError('Error al cargar justificativos de coordinadores');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleAprobar = async (id) => {
    try {
      await api.put(`/justificativos/aprobar/${id}`);
      setMensaje('✅ Justificativo aprobado correctamente');
      cargarDatos();
      setTimeout(() => setMensaje(''), 3000);
    } catch (err) {
      setError('Error al aprobar el justificativo');
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
    } catch (err) {
      setError('Error al rechazar el justificativo');
    }
  };

  const verDocumento = (url) => {
    if (!url) return;
    const fullUrl = url.startsWith('http') ? url : `${api.defaults.baseURL.replace('/api', '')}${url}`;
    const tipo = url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';
    setModalDocumento({ mostrar: true, url: fullUrl, tipo });
  };

  const generarPDF = async () => {
    try {
      const doc = new jsPDF();

      // Agregar logo en el membrete
      const logoUrl = '/6933620737_368c2eb1b7.jpg';
      const headerY = await addLogoHeader(doc, logoUrl);

      // Agregar marca de agua con el logo
      await addWatermark(doc, logoUrl);

      // Título del reporte
      doc.setFontSize(14);
      doc.setTextColor(80, 80, 80);
      doc.text("Reporte de Justificativos de Coordinadores", 105, headerY + 10, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generado por Auditor: ${user.nombre} ${user.apellido}`, 14, headerY + 20);
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, headerY + 27);

      const tableColumn = ["Coordinador", "Cédula", "Carrera", "Fecha Solicitud", "Asignatura", "Estado"];
      const tableRows = justificativos
        .filter(j => {
          const term = terminoBusqueda.toLowerCase();
          const matchesTerm = !terminoBusqueda ||
            `${j.nombre} ${j.apellido}`.toLowerCase().includes(term) ||
            (j.nombre_asignatura && j.nombre_asignatura.toLowerCase().includes(term)) ||
            (j.cedula && j.cedula.includes(term));

          if (!fechaInicio || !fechaFin) return matchesTerm;
          const date = new Date(j.fecha_solicitud);
          return matchesTerm && date >= new Date(fechaInicio) && date <= new Date(fechaFin);
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
        startY: headerY + 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [63, 81, 181] }
      });
      doc.save(`justificativos_coordinadores_${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error(err);
      setError('Error generando PDF');
    }
  };

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-indigo-600">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <p className="font-medium animate-pulse">Cargando justificativos de coordinadores...</p>
      </div>
    );
  }

  const justificativosFiltrados = justificativos.filter(j => {
    const term = terminoBusqueda.toLowerCase();
    const matchesTerm = !terminoBusqueda || 
      `${j.nombre} ${j.apellido}`.toLowerCase().includes(term) ||
      (j.nombre_asignatura && j.nombre_asignatura.toLowerCase().includes(term)) ||
      (j.cedula && j.cedula.includes(term));
    
    if (!fechaInicio || !fechaFin) return matchesTerm;
    const date = new Date(j.fecha_solicitud);
    return matchesTerm && date >= new Date(fechaInicio) && date <= new Date(fechaFin);
  });

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      {/* Header Premium */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100 text-2xl">
            <IconClipboard />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800" id="page-title">
              Control de Justificativos Coordinadores
            </h1>
            <p className="text-slate-500 font-medium">Gestión de inasistencias de coordinadores y adjuntos</p>
          </div>
        </div>
        
        <button 
          onClick={generarPDF}
          className="bg-white text-indigo-600 border-2 border-indigo-100 px-6 py-3 rounded-2xl font-bold hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-sm active:scale-95 focus:ring-4 focus:ring-indigo-500/20 outline-none"
        >
          <IconDownload aria-hidden="true" /> Exportar Reporte PDF
        </button>
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

      {/* Filtros */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 space-y-2 w-full">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Buscar Coordinador</label>
          <div className="relative group">
            <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" aria-hidden="true" />
            <input
              type="text"
              placeholder="Nombre, cédula o asignatura..."
              className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold"
              value={terminoBusqueda}
              onChange={(e) => setTerminoBusqueda(e.target.value)}
            />
          </div>
        </div>
        <div className="w-full md:w-48 space-y-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Desde</label>
          <input 
            type="date" 
            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500" 
            value={fechaInicio} 
            onChange={(e) => setFechaInicio(e.target.value)} 
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
        <div className="w-full md:w-48 space-y-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Hasta</label>
          <input 
            type="date" 
            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500" 
            value={fechaFin} 
            onChange={(e) => setFechaFin(e.target.value)} 
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>

      {/* Tabla Principal */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Fecha</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Coordinador</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Asignatura</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Estado</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {justificativosFiltrados.map((j) => (
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
                          title="Ver Documento"
                        >
                          <IconEye aria-hidden="true" />
                        </button>
                      )}
                      {j.estado === 'pendiente' && (
                        <>
                          <button 
                            onClick={() => handleAprobar(j.id_justificativo)}
                            className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm focus:ring-4 focus:ring-emerald-500/20 outline-none"
                            title="Aprobar"
                          >
                            <IconCheck aria-hidden="true" />
                          </button>
                          <button 
                            onClick={() => setModalRechazo({ mostrar: true, id_justificativo: j.id_justificativo, observaciones: '' })}
                            className="w-9 h-9 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm focus:ring-4 focus:ring-rose-500/20 outline-none"
                            title="Rechazar"
                          >
                            <IconCancel aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {justificativosFiltrados.length === 0 && (
            <div className="p-20 text-center text-slate-400 font-medium bg-slate-50/30">
              No se encontraron registros de justificativos de coordinadores
            </div>
          )}
        </div>
      </div>

      {/* Modal Visualizar Documento */}
      {modalDocumento.mostrar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-fade-in" onClick={() => setModalDocumento({ ...modalDocumento, mostrar: false })}></div>
          <div className="bg-white rounded-[40px] w-full max-w-4xl h-[85vh] shadow-2xl relative z-10 animate-zoom-in overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
                  <IconEye aria-hidden="true" />
                </div>
                Visualización de Soporte
              </h3>
              <button 
                onClick={() => setModalDocumento({ ...modalDocumento, mostrar: false })} 
                className="text-slate-400 hover:text-slate-600 bg-white w-10 h-10 rounded-full flex items-center justify-center shadow-sm focus:ring-4 focus:ring-slate-100 outline-none"
              >
                <IconCancel aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 bg-slate-200 overflow-auto p-4 flex items-center justify-center">
              {modalDocumento.tipo === 'pdf' ? (
                <iframe src={modalDocumento.url} className="w-full h-full rounded-2xl shadow-lg bg-white" title="Vista previa" />
              ) : (
                <img src={modalDocumento.url} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" alt="Soporte" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Rechazar */}
      {modalRechazo.mostrar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setModalRechazo({ mostrar: false, id_justificativo: null, observaciones: '' })}></div>
          <div className="bg-white rounded-[40px] w-full max-w-md p-10 shadow-2xl relative z-10 animate-zoom-in">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[24px] flex items-center justify-center text-3xl mx-auto mb-6 shadow-lg shadow-rose-100">
                <IconAlert aria-hidden="true" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">Rechazar Solicitud</h3>
              <p className="text-slate-500 font-medium">Por favor, indica el motivo del rechazo.</p>
            </div>
            
            <textarea
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all font-medium text-slate-700 min-h-[120px] mb-8"
              placeholder="Ej: Documento ilegible..."
              value={modalRechazo.observaciones}
              onChange={(e) => setModalRechazo({ ...modalRechazo, observaciones: e.target.value })}
            />

            <div className="flex gap-3">
              <button 
                onClick={handleRechazar}
                className="flex-1 bg-rose-500 text-white py-4 rounded-2xl font-black hover:bg-rose-600 transition-all shadow-xl shadow-rose-200 active:scale-95 focus:ring-4 focus:ring-rose-500/40 outline-none"
              >
                Confirmar Rechazo
              </button>
              <button 
                onClick={() => setModalRechazo({ mostrar: false, id_justificativo: null, observaciones: '' })} 
                className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all focus:ring-4 focus:ring-slate-200 outline-none"
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

export default JustificativosCoordinadores;
