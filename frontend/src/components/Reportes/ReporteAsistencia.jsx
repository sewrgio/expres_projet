import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addLogoHeader, addWatermark } from '../../utils/pdfHelper';

const ReporteAsistencia = () => {
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


  // Estado del usuario (roles, etc.)
  const [userInfo, setUserInfo] = React.useState({ roles: [] });

  // Cargar datos del reporte y la información del usuario
  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [asisRes, inasRes, justRes] = await Promise.all([
        api.get('/asistencias/todas'),
        api.get('/asistencias/faltas'),
        api.get('/justificativos')
      ]);
      setAsistencias(asisRes.data);
      setInasistencias(inasRes.data || []);
      setJustificativos(justRes.data || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);


// Duplicate cargarDatos removed – using the earlier definition.


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
      const titulo = tipo === 'completo' ? 'REPORTE COMPLETO DE ASISTENCIAS E INASISTENCIAS' :
                      tipo === 'asistencias' ? 'REPORTE DE ASISTENCIAS' :
                      tipo === 'inasistencias' ? 'REPORTE DE INASISTENCIAS' : 'REPORTE DE JUSTIFICATIVOS';

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
        alert('⚠️ El reporte es muy extenso (' + asisFiltradas.length + ' registros). Se limitará el PDF a los primeros 1000 registros para evitar errores del navegador. Por favor, usa los filtros de fecha.');
        asisFiltradas = asisFiltradas.slice(0, 1000);
      }
      doc.setFontSize(14);
      doc.text('ASISTENCIAS', 14, yOffset);
      yOffset += 7;
      
      const tableAsistencias = asisFiltradas.map(a => {
        const entrada = new Date(a.fecha_entrada);
        const salida = a.fecha_salida ? new Date(a.fecha_salida) : null;
        const totalMinutes = salida ? (salida - entrada) / (1000 * 60) : 0;
        const horasReloj = salida ? (totalMinutes / 60).toFixed(1) : '--';
        const horasAcademicas = salida ? (totalMinutes / 45).toFixed(1) : '--';

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
        if (tipo === 'inasistencias') alert('⚠️ El reporte es muy extenso. Se limitará a 1000 registros.');
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
        head: [['Profesor', 'Fecha', 'Asignatura', 'Tipo', 'Justificado']],
        body: tableInasistencias,
        startY: yOffset,
        theme: 'striped',
        headStyles: { fillColor: [0, 51, 102], textColor: 255 },
      });
      yOffset = doc.lastAutoTable.finalY + 10;
    }

    if (tipo === 'completo' || tipo === 'justificativos') {
      let justFiltradas = filtrarDatos(justificativos);

      if (justFiltradas.length > 1000) {
        if (tipo === 'justificativos') alert('⚠️ El reporte es muy extenso. Se limitará a 1000 registros.');
        justFiltradas = justFiltradas.slice(0, 1000);
      }
      doc.setFontSize(14);
      doc.text('JUSTIFICATIVOS', 14, yOffset);
      yOffset += 7;
      
      const tableJustificativos = justFiltradas.map(j => [
        (j.nombre || '') + ' ' + (j.apellido || ''),
        new Date(j.fecha_solicitud).toLocaleDateString(),
        new Date(j.fecha_entrada).toLocaleDateString(),
        j.nombre_carrera || 'N/A',
        j.motivo || 'N/A',
        j.estado || 'N/A'
      ]);
      
      autoTable(doc, {
        head: [['Usuario', 'F. Solicitud', 'F. Inasistencia', 'Carrera', 'Motivo', 'Estado']],
        body: tableJustificativos,
        startY: yOffset,
        theme: 'striped',
        headStyles: { fillColor: [0, 51, 102], textColor: 255 },
      });
    }
    
    doc.save(`reporte_${tipo}_${Date.now()}.pdf`);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error generando PDF: ' + error.message);
    }
  };

  const asistenciasFiltradas = filtrarDatos(asistencias);
  const inasistenciasFiltradas = filtrarDatos(inasistencias);
  const justificativosFiltradas = filtrarDatos(justificativos);

  if (cargando) return <div className="card">Cargando...</div>;

  return (
    <div>
      <div className="card">

        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input type="date" className="form-control border rounded p-2" style={{ width: 'auto' }} value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} max={new Date().toISOString().split('T')[0]} />
          <input type="date" className="form-control border rounded p-2" style={{ width: 'auto' }} value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} max={new Date().toISOString().split('T')[0]} />
          {/* Buscador de docente con autocompletado */}
          <div ref={docenteRef} style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              className="form-control border rounded p-2"
              style={{ width: '100%' }}
              placeholder="Buscar docente por nombre o cédula..."
              value={filtroDocente}
              onChange={(e) => {
                setFiltroDocente(e.target.value);
                buscarDocentes(e.target.value);
              }}
              onFocus={() => { if (sugerencias.length > 0) setMostrarSugerencias(true); }}
            />
            {buscandoDocente && (
              <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#888' }}>⏳</span>
            )}
            {mostrarSugerencias && sugerencias.length > 0 && (
              <ul style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 1000,
                listStyle: 'none', margin: 0, padding: '4px 0', maxHeight: '220px', overflowY: 'auto'
              }}>
                {sugerencias.map(prof => (
                  <li
                    key={prof.id_profesor}
                    style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    onMouseDown={() => {
                      setFiltroDocente(`${prof.nombre} ${prof.apellido}`);
                      setMostrarSugerencias(false);
                      setSugerencias([]);
                    }}
                  >
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{prof.nombre} {prof.apellido}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>C.I: {prof.cedula}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button className="btn btn-secondary" onClick={cargarDatos}>Actualizar</button>
          <button className="btn btn-warning" onClick={() => { setFechaInicio(''); setFechaFin(''); setFiltroDocente(''); setSugerencias([]); cargarDatos(); }}>Limpiar</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div className="card" style={{ flex: 1, cursor: 'pointer', backgroundColor: activeTab === 'asistencias' ? '#e8f4f8' : 'white' }} onClick={() => setActiveTab('asistencias')}>
          <h3>✅ Asistencias</h3>
          <p>Total: {asistenciasFiltradas.length}</p>
        </div>
        <div className="card" style={{ flex: 1, cursor: 'pointer', backgroundColor: activeTab === 'inasistencias' ? '#e8f4f8' : 'white' }} onClick={() => setActiveTab('inasistencias')}>
          <h3>⚠️ Inasistencias</h3>
          <p>Total: {inasistenciasFiltradas.length}</p>
        </div>
      </div>

      {(activeTab === 'asistencias') && (
        <div className="card">
          <h3 className="card-title">Lista de Asistencias</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th className="p-4">Personal</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Entrada</th>
                  <th className="hidden md:table-cell p-4">Salida</th>
                  <th className="hidden lg:table-cell p-4">Hrs Reloj</th>
                  <th className="hidden lg:table-cell p-4">Hrs Acad.</th>
                  <th className="hidden sm:table-cell p-4">Ubicación</th>
                </tr>
              </thead>
              <tbody>
                {asistenciasFiltradas.map(asis => {
                  const entrada = new Date(asis.fecha_entrada);
                  const salida = asis.fecha_salida ? new Date(asis.fecha_salida) : null;
                  return (
                    <tr key={asis.id_asistencia}>
                      <td className="p-4">{asis.nombre} {asis.apellido}</td>
                      <td className="p-4">{entrada.toLocaleDateString()}</td>
                      <td className="p-4">{entrada.toLocaleTimeString()}</td>
                      <td className="hidden md:table-cell p-4">{salida ? salida.toLocaleTimeString() : '--'}</td>
                      <td className="hidden lg:table-cell p-4">{asis.horas_reloj ? Number(asis.horas_reloj).toFixed(1) : '-'}</td>
                      <td className="hidden lg:table-cell p-4">{asis.horas_academicas ? Number(asis.horas_academicas).toFixed(1) : '-'}</td>
                      <td className="hidden sm:table-cell p-4">{asis.ubicacion || '-'}</td>
                    </tr>
                  );
                })}
                {asistenciasFiltradas.length === 0 && <tr><td colSpan="7">No hay asistencias</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'inasistencias' && (
        <div className="card">
          <h3 className="card-title">Lista de Inasistencias</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th className="p-4">Profesor</th>
                  <th className="p-4">Fecha</th>
                  <th className="hidden sm:table-cell p-4">Asignatura</th>
                  <th className="p-4">Tipo</th>
                  <th className="hidden sm:table-cell p-4">Justificado</th>
                </tr>
              </thead>
              <tbody>
                {inasistenciasFiltradas.map(inas => (
                  <tr key={inas.id_asistencia}>
                    <td className="p-4">{inas.nombre} {inas.apellido}</td>
                    <td className="p-4">{new Date(inas.fecha_entrada).toLocaleDateString()}</td>
                    <td className="hidden sm:table-cell p-4">{inas.nombre_carrera}</td>
                    <td className="p-4"><span className="status-badge status-danger">Inasistencia</span></td>
                    <td className="hidden sm:table-cell p-4">❌ No</td>
                  </tr>
                ))}
                {inasistenciasFiltradas.length === 0 && <tr><td colSpan="5">No hay inasistencias</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReporteAsistencia;