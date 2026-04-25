import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const ReporteAsistencia = () => {
  const [activeTab, setActiveTab] = useState('asistencias');
  const [asistencias, setAsistencias] = useState([]);
  const [inasistencias, setInasistencias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [asisRes, inasRes] = await Promise.all([
        api.get('/asistencias/todas'),
        api.get('/asistencias/faltas')
      ]);
      setAsistencias(asisRes.data);
      setInasistencias(inasRes.data || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setCargando(false);
    }
  };

  const filtrarPorFecha = (lista) => {
    if (!fechaInicio && !fechaFin) return lista;
    return lista.filter(item => {
      const fecha = new Date(item.fecha_entrada || item.fecha_clase);
      const inicio = fechaInicio ? new Date(fechaInicio) : null;
      const fin = fechaFin ? new Date(fechaFin) : null;
      if (inicio && fecha < inicio) return false;
      if (fin && fecha > fin) return false;
      return true;
    });
  };

  const generarPDFCompleto = (tipo) => {
    const doc = new jsPDF();
    const fechaActual = new Date().toLocaleDateString();
    const titulo = tipo === 'completo' ? 'REPORTE COMPLETO DE ASISTENCIAS E INASISTENCIAS' :
                    tipo === 'asistencias' ? 'REPORTE DE ASISTENCIAS' : 'REPORTE DE INASISTENCIAS';
    
    doc.setFontSize(18);
    doc.text(titulo, 14, 20);
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${fechaActual}`, 14, 30);
    doc.text(`Período: ${fechaInicio || 'Inicio'} - ${fechaFin || 'Fin'}`, 14, 37);
    
    let yOffset = 50;
    
    if (tipo === 'completo' || tipo === 'asistencias') {
      let asisFiltradas = filtrarPorFecha(asistencias);
      
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
      
      doc.autoTable({
        head: [['Personal', 'Fecha', 'Entrada', 'Salida', 'Hrs Reloj', 'Hrs Acad.', 'Ubicación']],
        body: tableAsistencias,
        startY: yOffset,
        theme: 'striped',
        headStyles: { fillColor: [0, 51, 102], textColor: 255 },
      });
      yOffset = doc.lastAutoTable.finalY + 10;
    }
    
    if (tipo === 'completo' || tipo === 'inasistencias') {
      let inasFiltradas = filtrarPorFecha(inasistencias);

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
      
      doc.autoTable({
        head: [['Profesor', 'Fecha', 'Asignatura', 'Tipo', 'Justificado']],
        body: tableInasistencias,
        startY: yOffset,
        theme: 'striped',
        headStyles: { fillColor: [0, 51, 102], textColor: 255 },
      });
    }
    
    doc.save(`reporte_${tipo}_${Date.now()}.pdf`);
  };

  const asistenciasFiltradas = filtrarPorFecha(asistencias);
  const inasistenciasFiltradas = filtrarPorFecha(inasistencias);

  if (cargando) return <div className="card">Cargando...</div>;

  return (
    <div>
      <div className="card">
        <h3 className="card-title">Reportes de Asistencia</h3>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input type="date" className="form-control" style={{ width: 'auto' }} value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          <input type="date" className="form-control" style={{ width: 'auto' }} value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
          <button className="btn btn-secondary" onClick={cargarDatos}>Actualizar</button>
          <button className="btn btn-warning" onClick={() => { setFechaInicio(''); setFechaFin(''); cargarDatos(); }}>Limpiar</button>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <button className="btn btn-primary" onClick={() => generarPDFCompleto('completo')}>📄 PDF Completo (Asistencias + Inasistencias)</button>
          <button className="btn btn-success" onClick={() => generarPDFCompleto('asistencias')}>📄 Solo Asistencias</button>
          <button className="btn btn-danger" onClick={() => generarPDFCompleto('inasistencias')}>📄 Solo Inasistencias</button>
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

      {activeTab === 'asistencias' && (
        <div className="card">
          <h3 className="card-title">Lista de Asistencias</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Personal</th><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Hrs Reloj</th><th>Hrs Acad.</th><th>Ubicación</th></tr>
              </thead>
              <tbody>
                {asistenciasFiltradas.map(asis => {
                  const entrada = new Date(asis.fecha_entrada);
                  const salida = asis.fecha_salida ? new Date(asis.fecha_salida) : null;
                  return (
                    <tr key={asis.id_asistencia}>
                      <td>{asis.nombre} {asis.apellido}</td>
                      <td>{entrada.toLocaleDateString()}</td>
                      <td>{entrada.toLocaleTimeString()}</td>
                      <td>{salida ? salida.toLocaleTimeString() : '--'}</td>
                      <td>{asis.horas_reloj ? Number(asis.horas_reloj).toFixed(1) : '-'}</td>
                      <td>{asis.horas_academicas ? Number(asis.horas_academicas).toFixed(1) : '-'}</td>
                      <td>{asis.ubicacion || '-'}</td>
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
                <tr><th>Profesor</th><th>Fecha</th><th>Asignatura</th><th>Tipo</th><th>Justificado</th></tr>
              </thead>
              <tbody>
                {inasistenciasFiltradas.map(inas => (
                  <tr key={inas.id_asistencia}>
                    <td>{inas.nombre} {inas.apellido}</td>
                    <td>{new Date(inas.fecha_entrada).toLocaleDateString()}</td>
                    <td>{inas.nombre_carrera}</td>
                    <td><span className="status-badge status-danger">Inasistencia</span></td>
                    <td>❌ No</td>
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