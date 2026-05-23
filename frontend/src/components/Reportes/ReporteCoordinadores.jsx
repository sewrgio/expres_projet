import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addLogoHeader, addWatermark } from '../../utils/pdfHelper';
import {
  IconChart, IconClock, IconSearch, IconCheck, IconAlert, IconDownload
} from '../Icons/SystemIcons';

const ReporteCoordinadores = () => {
  const [activeTab, setActiveTab] = useState('asistencias');
  const [asistencias, setAsistencias] = useState([]);
  const [inasistencias, setInasistencias] = useState([]);
  const [justificativos, setJustificativos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [filtroDocente, setFiltroDocente] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [buscandoDocente, setBuscandoDocente] = useState(false);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const docenteRef = useRef(null);

  const buscarDocentes = useCallback(async (q) => {
    if (q.length < 2) { setSugerencias([]); return; }
    setBuscandoDocente(true);
    try {
      const res = await api.get(`/profesores/buscar?q=${q}`);
      setSugerencias(res.data || []);
      setMostrarSugerencias(true);
    } catch (e) {
      console.error(e);
    } finally {
      setBuscandoDocente(false);
    }
  }, []);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (docenteRef.current && !docenteRef.current.contains(e.target)) {
        setMostrarSugerencias(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [asisRes, inasRes, justRes] = await Promise.all([
        api.get('/asistencias/todas'),
        api.get('/asistencias/faltas'),
        api.get('/justificativos/todos')
      ]);
      setAsistencias(asisRes.data);
      setInasistencias(inasRes.data || []);
      setJustificativos(justRes.data || []);
    } catch (error) {
      console.error('Error cargando datos de coordinadores:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const filtrarDatos = (lista) => {
    return lista.filter(item => {
      const fechaBase = item.fecha_entrada || item.fecha_clase || item.fecha_solicitud;
      const fecha = new Date(fechaBase);
      const inicio = fechaInicio ? new Date(fechaInicio) : null;
      const fin = fechaFin ? new Date(fechaFin) : null;
      if (inicio && fecha < inicio) return false;
      if (fin && fecha > fin) return false;
      
      const nombreCompleto = `${item.nombre || ''} ${item.apellido || ''}`.toLowerCase();
      if (filtroDocente && !nombreCompleto.includes(filtroDocente.toLowerCase())) return false;
      
      return true;
    });
  };

  const generarPDFCompleto = async (tipo) => {
    try {
      const doc = new jsPDF();
      const fechaActual = new Date().toLocaleDateString();
      const titulo = tipo === 'completo' ? 'REPORTE COMPLETO DE COORDINADORES' :
                      tipo === 'asistencias' ? 'REPORTE DE ASISTENCIAS DE COORDINADORES' :
                      tipo === 'inasistencias' ? 'REPORTE DE INASISTENCIAS DE COORDINADORES' : 'REPORTE DE JUSTIFICATIVOS DE COORDINADORES';

      // Agregar logo en el membrete
      const logoUrl = '/6933620737_368c2eb1b7.jpg';
      const headerY = await addLogoHeader(doc, logoUrl);

      // Agregar marca de agua con el logo
      await addWatermark(doc, logoUrl);

      // Título del reporte
      doc.setFontSize(14);
      doc.setTextColor(80, 80, 80);
      doc.text(titulo, 105, headerY + 10, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Fecha de generación: ${fechaActual}`, 14, headerY + 20);
      doc.text(`Período: ${fechaInicio || 'Inicio'} - ${fechaFin || 'Fin'}`, 14, headerY + 27);

      let yOffset = headerY + 35;
    
      if (tipo === 'completo' || tipo === 'asistencias') {
        let asisFiltradas = filtrarDatos(asistencias);
        if (asisFiltradas.length > 1000) {
          asisFiltradas = asisFiltradas.slice(0, 1000);
        }
        doc.setFontSize(14);
        doc.text('ASISTENCIAS', 14, yOffset);
        yOffset += 7;
        
        const tableAsistencias = asisFiltradas.map(a => {
          const entrada = new Date(a.fecha_entrada);
          const salida = a.fecha_salida ? new Date(a.fecha_salida) : null;
          return [
            (a.nombre || '') + ' ' + (a.apellido || ''),
            entrada.toLocaleDateString(),
            entrada.toLocaleTimeString(),
            salida ? salida.toLocaleTimeString() : '--',
            a.horas_reloj ? Number(a.horas_reloj).toFixed(1) : '--',
            a.horas_academicas ? Number(a.horas_academicas).toFixed(1) : '--',
            a.ubicacion || 'N/A'
          ];
        });
        
        autoTable(doc, {
          head: [['Personal', 'Fecha', 'Entrada', 'Salida', 'Hrs Reloj', 'Hrs Acad.', 'Ubicación']],
          body: tableAsistencias,
          startY: yOffset,
          theme: 'striped',
          headStyles: { fillColor: [0, 51, 102], textColor: 255 },
        });
        yOffset = doc.lastAutoTable.finalY + 10;
      }
      
      if (tipo === 'completo' || tipo === 'inasistencias') {
        let inasFiltradas = filtrarDatos(inasistencias);
        if (inasFiltradas.length > 1000) {
          inasFiltradas = inasFiltradas.slice(0, 1000);
        }
        doc.setFontSize(14);
        doc.text('INASISTENCIAS', 14, yOffset);
        yOffset += 7;
        
        const tableInasistencias = inasFiltradas.map(i => [
          (i.nombre || '') + ' ' + (i.apellido || ''),
          new Date(i.fecha_entrada).toLocaleDateString(),
          i.nombre_carrera || 'N/A',
          'Inasistencia',
          'No'
        ]);
        
        autoTable(doc, {
          head: [['Coordinador', 'Fecha', 'Asignatura/Carrera', 'Tipo', 'Justificado']],
          body: tableInasistencias,
          startY: yOffset,
          theme: 'striped',
          headStyles: { fillColor: [0, 51, 102], textColor: 255 },
        });
      }
      
      doc.save(`reporte_coordinadores_${tipo}_${Date.now()}.pdf`);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error generando PDF: ' + error.message);
    }
  };

  const asistenciasFiltradas = filtrarDatos(asistencias);
  const inasistenciasFiltradas = filtrarDatos(inasistencias);

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-indigo-600">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <p className="font-medium animate-pulse">Cargando reportes de coordinadores...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      {/* Header Premium */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100 text-2xl">
            <IconChart />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800" id="page-title">
              Reportes Coordinadores
            </h1>
            <p className="text-slate-500 font-medium">Control e historial de asistencia de coordinadores y adjuntos</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => generarPDFCompleto('completo')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg active:scale-95 focus:ring-4 focus:ring-indigo-500/40 outline-none"
          >
            <IconDownload aria-hidden="true" /> PDF Completo
          </button>
          <button 
            onClick={() => generarPDFCompleto('asistencias')}
            className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg active:scale-95 focus:ring-4 focus:ring-emerald-500/40 outline-none"
          >
            <IconDownload aria-hidden="true" /> Solo Asistencias
          </button>
          <button 
            onClick={() => generarPDFCompleto('inasistencias')}
            className="bg-rose-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-rose-700 transition-all flex items-center gap-2 shadow-lg active:scale-95 focus:ring-4 focus:ring-rose-500/40 outline-none"
          >
            <IconDownload aria-hidden="true" /> Solo Inasistencias
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 space-y-2 w-full" ref={docenteRef}>
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Buscar Coordinador</label>
          <div className="relative group">
            <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" aria-hidden="true" />
            <input
              type="text"
              placeholder="Buscar docente por nombre o cédula..."
              className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold"
              value={filtroDocente}
              onChange={(e) => {
                setFiltroDocente(e.target.value);
                buscarDocentes(e.target.value);
              }}
              onFocus={() => { if (sugerencias.length > 0) setMostrarSugerencias(true); }}
            />
            {buscandoDocente && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">⏳</span>
            )}
            {mostrarSugerencias && sugerencias.length > 0 && (
              <ul className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 mt-2 py-2 max-h-60 overflow-y-auto">
                {sugerencias.map(prof => (
                  <li
                    key={prof.id_profesor}
                    className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b last:border-0 border-slate-100"
                    onMouseDown={() => {
                      setFiltroDocente(`${prof.nombre} ${prof.apellido}`);
                      setMostrarSugerencias(false);
                      setSugerencias([]);
                    }}
                  >
                    <div className="font-bold text-slate-700">{prof.nombre} {prof.apellido}</div>
                    <div className="text-xs text-slate-400">C.I: {prof.cedula}</div>
                  </li>
                ))}
              </ul>
            )}
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
        <button 
          onClick={cargarDatos}
          className="bg-slate-100 text-slate-600 px-6 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all focus:ring-4 focus:ring-slate-200 outline-none"
        >
          Actualizar
        </button>
        <button 
          onClick={() => { setFechaInicio(''); setFechaFin(''); setFiltroDocente(''); setSugerencias([]); cargarDatos(); }}
          className="bg-amber-100 text-amber-600 px-6 py-4 rounded-2xl font-bold hover:bg-amber-200 transition-all focus:ring-4 focus:ring-amber-200 outline-none"
        >
          Limpiar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4">
        <button 
          onClick={() => setActiveTab('asistencias')}
          className={`flex-1 p-6 rounded-3xl border transition-all text-left relative overflow-hidden ${
            activeTab === 'asistencias' 
              ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 text-emerald-800 shadow-md shadow-emerald-500/5' 
              : 'bg-white border-slate-100 hover:bg-slate-50/50'
          }`}
        >
          <div className="text-emerald-500 text-3xl mb-2"><IconCheck /></div>
          <h3 className="font-black text-lg">✅ Asistencias</h3>
          <p className="text-slate-500 text-sm font-medium mt-1">Total: {asistenciasFiltradas.length}</p>
        </button>
        <button 
          onClick={() => setActiveTab('inasistencias')}
          className={`flex-1 p-6 rounded-3xl border transition-all text-left relative overflow-hidden ${
            activeTab === 'inasistencias' 
              ? 'bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200 text-rose-800 shadow-md shadow-rose-500/5' 
              : 'bg-white border-slate-100 hover:bg-slate-50/50'
          }`}
        >
          <div className="text-rose-500 text-3xl mb-2"><IconAlert /></div>
          <h3 className="font-black text-lg">⚠️ Inasistencias</h3>
          <p className="text-slate-500 text-sm font-medium mt-1">Total: {inasistenciasFiltradas.length}</p>
        </button>
      </div>

      {/* Listado */}
      {activeTab === 'asistencias' ? (
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-lg">Lista de Asistencias de Coordinadores</h3>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Coordinador</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Fecha</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Entrada</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Salida</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Hrs Reloj</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Hrs Acad.</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Ubicación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {asistenciasFiltradas.map(asis => {
                  const entrada = new Date(asis.fecha_entrada);
                  const salida = asis.fecha_salida ? new Date(asis.fecha_salida) : null;
                  return (
                    <tr key={asis.id_asistencia} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-5 font-bold text-slate-800">{asis.nombre} {asis.apellido}</td>
                      <td className="px-6 py-5 font-medium text-slate-600">{entrada.toLocaleDateString()}</td>
                      <td className="px-6 py-5 text-slate-600">{entrada.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-6 py-5 text-slate-600">{salida ? salida.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</td>
                      <td className="px-6 py-5 font-mono text-slate-500">{asis.horas_reloj ? Number(asis.horas_reloj).toFixed(1) : '-'}</td>
                      <td className="px-6 py-5 font-mono text-slate-500">{asis.horas_academicas ? Number(asis.horas_academicas).toFixed(1) : '-'}</td>
                      <td className="px-6 py-5 text-slate-500 font-medium">{asis.ubicacion || '-'}</td>
                    </tr>
                  );
                })}
                {asistenciasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-20 text-center text-slate-400 font-medium bg-slate-50/30">
                      No hay asistencias registradas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-lg">Lista de Inasistencias de Coordinadores</h3>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Coordinador</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Fecha</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Asignatura/Área</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Tipo</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Justificado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {inasistenciasFiltradas.map(inas => (
                  <tr key={inas.id_asistencia} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-5 font-bold text-slate-800">{inas.nombre} {inas.apellido}</td>
                    <td className="px-6 py-5 font-medium text-slate-600">{new Date(inas.fecha_entrada).toLocaleDateString()}</td>
                    <td className="px-6 py-5 text-slate-600">{inas.nombre_carrera || 'N/A'}</td>
                    <td className="px-6 py-5">
                      <span className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-[10px] font-black uppercase tracking-widest">
                        Inasistencia
                      </span>
                    </td>
                    <td className="px-6 py-5 text-slate-500 font-medium">❌ No</td>
                  </tr>
                ))}
                {inasistenciasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-20 text-center text-slate-400 font-medium bg-slate-50/30">
                      No hay inasistencias registradas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReporteCoordinadores;
