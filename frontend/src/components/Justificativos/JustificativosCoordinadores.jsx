import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addLogoHeader, addWatermark } from '../../utils/pdfHelper';
import { IconCheck, IconAlert, IconDownload, IconSearch, IconClock } from '../Icons/SystemIcons';

const JustificativosCoordinadores = () => {
  const [justificativos, setJustificativos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroDocente, setFiltroDocente] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const docenteRef = useRef(null);

  // Autocomplete for docentes (coordinadores/adjuntos)
  const buscarDocentes = useCallback(async (q) => {
    if (q.length < 2) { setSugerencias([]); return; }
    setBuscando(true);
    try {
      const res = await api.get(`/profesores/buscar?q=${q}`);
      setSugerencias(res.data || []);
      setMostrarSugerencias(true);
    } catch (e) {
      console.error(e);
    } finally {
      setBuscando(false);
    }
  }, []);

  // Close suggestions on click outside
  useEffect(() => {
    const handler = (e) => {
      if (docenteRef.current && !docenteRef.current.contains(e.target)) {
        setMostrarSugerencias(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const res = await api.get('/justificativos/todos');
      setJustificativos(res.data || []);
    } catch (e) {
      console.error('Error al cargar justificativos:', e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const filtrar = (lista) => {
    if (!filtroDocente) return lista;
    const term = filtroDocente.toLowerCase();
    return lista.filter(item => {
      const nombre = `${item.nombre || ''} ${item.apellido || ''}`.toLowerCase();
      return nombre.includes(term);
    });
  };

  const generarPDF = async () => {
    try {
      const doc = new jsPDF();
      const fechaActual = new Date().toLocaleDateString();

      // Agregar logo en el membrete
      const logoUrl = '/6933620737_368c2eb1b7.jpg';
      const headerY = await addLogoHeader(doc, logoUrl);

      // Agregar marca de agua con el logo
      await addWatermark(doc, logoUrl);

      // Título del reporte
      doc.setFontSize(13);
      doc.setTextColor(80, 80, 80);
      doc.text('Justificativos de Coordinadores y Adjuntos', 105, headerY + 10, { align: 'center' });

      doc.setFontSize(9);
      doc.setTextColor(130, 130, 130);
      doc.text(`Fecha de generación: ${fechaActual}`, 14, headerY + 20);

      const rows = filtrados.map(j => [
        `${j.nombre || ''} ${j.apellido || ''}`.trim(),
        j.motivo || '-',
        (j.estado || '-').toUpperCase(),
        new Date(j.fecha_solicitud).toLocaleDateString()
      ]);

      autoTable(doc, {
        head: [['Coordinador', 'Motivo', 'Estado', 'Fecha solicitud']],
        body: rows,
        startY: headerY + 25,
        theme: 'striped',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [0, 51, 102], textColor: 255 },
      });

      doc.save(`justificativos_coordinadores_${Date.now()}.pdf`);
    } catch (err) {
      console.error('Error generando PDF:', err);
      alert('Error generando PDF: ' + err.message);
    }
  };


  const filtrados = filtrar(justificativos);

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-indigo-600">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <p className="font-medium animate-pulse">Cargando justificativos...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100 text-2xl">
            <IconCheck />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800" id="page-title">
              Justificativos Coordinadores
            </h1>
            <p className="text-slate-500 font-medium">Revisión y gestión de justificativos de coordinadores y adjuntos</p>
          </div>
        </div>
        <button onClick={generarPDF} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg active:scale-95 focus:ring-4 focus:ring-emerald-500/40 outline-none">
          <IconDownload aria-hidden="true" /> PDF
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 space-y-2 w-full" ref={docenteRef}>
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Buscar Coordinador</label>
          <div className="relative group">
            <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" aria-hidden="true" />
            <input
              type="text"
              placeholder="Nombre o cédula..."
              className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold"
              value={filtroDocente}
              onChange={(e) => { setFiltroDocente(e.target.value); buscarDocentes(e.target.value); }}
              onFocus={() => { if (sugerencias.length > 0) setMostrarSugerencias(true); }}
            />
            {buscando && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">⏳</span>
            )}
            {mostrarSugerencias && sugerencias.length > 0 && (
              <ul className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 mt-2 py-2 max-h-60 overflow-y-auto">
                {sugerencias.map(prof => (
                  <li
                    key={prof.id_profesor}
                    className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b last:border-0 border-slate-100"
                    onMouseDown={() => { setFiltroDocente(`${prof.nombre} ${prof.apellido}`); setMostrarSugerencias(false); setSugerencias([]); }}
                  >
                    <div className="font-bold text-slate-700">{prof.nombre} {prof.apellido}</div>
                    <div className="text-xs text-slate-400">C.I: {prof.cedula}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <button onClick={cargarDatos} className="bg-slate-100 text-slate-600 px-6 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all focus:ring-4 focus:ring-slate-200 outline-none">
          Actualizar
        </button>
        <button onClick={() => { setFiltroDocente(''); setSugerencias([]); cargarDatos(); }} className="bg-amber-100 text-amber-600 px-6 py-4 rounded-2xl font-bold hover:bg-amber-200 transition-all focus:ring-4 focus:ring-amber-200 outline-none">
          Limpiar
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-lg">Lista de Justificativos</h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Coordinador</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Motivo</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Estado</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Fecha solicitud</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrados.map(just => (
                <tr key={just.id_justificativo} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-5 font-bold text-slate-800">{just.nombre} {just.apellido}</td>
                  <td className="px-6 py-5 text-slate-600 font-medium">{just.motivo || '-'} </td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      just.estado === 'aprobado' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      just.estado === 'pendiente' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                      'bg-rose-50 text-rose-600 border border-rose-100'
                    }`}>{just.estado || '---'}</span>
                  </td>
                  <td className="px-6 py-5 text-slate-600">{new Date(just.fecha_solicitud).toLocaleDateString()}</td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan="4" className="p-20 text-center text-slate-400 font-medium bg-slate-50/30">No hay justificativos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default JustificativosCoordinadores;
