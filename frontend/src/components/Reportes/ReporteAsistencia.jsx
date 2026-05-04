import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Función helper para cargar imagen como base64
const loadImageAsBase64 = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      resolve(dataUrl);
    };
    img.onerror = reject;
    img.src = url;
  });
};

const ReporteAsistencia = () => {
  const [activeTab, setActiveTab] = useState('asistencias');
  const [asistencias, setAsistencias] = useState([]);
  const [inasistencias, setInasistencias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [filtroDocente, setFiltroDocente] = useState('');
  const [filtroCarrera, setFiltroCarrera] = useState('');

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

  const filtrarDatos = (lista) => {
    return lista.filter(item => {
      const fecha = new Date(item.fecha_entrada || item.fecha_clase);
      const inicio = fechaInicio ? new Date(fechaInicio) : null;
      const fin = fechaFin ? new Date(fechaFin) : null;
      if (inicio && fecha < inicio) return false;
      if (fin && fecha > fin) return false;
      
      const nombreCompleto = `${item.nombre || ''} ${item.apellido || ''}`.toLowerCase();
      if (filtroDocente && !nombreCompleto.includes(filtroDocente.toLowerCase())) return false;
      
      const carrera = (item.nombre_carrera || '').toLowerCase();
      if (filtroCarrera && !carrera.includes(filtroCarrera.toLowerCase())) return false;
      
      return true;
    });
  };

  const generarPDFCompleto = async (tipo) => {
    try {
      const doc = new jsPDF();
      const fechaActual = new Date().toLocaleDateString();
      const titulo = tipo === 'completo' ? 'REPORTE COMPLETO DE ASISTENCIAS E INASISTENCIAS' :
                      tipo === 'asistencias' ? 'REPORTE DE ASISTENCIAS' : 'REPORTE DE INASISTENCIAS';
      
      // ✅ Cargar logo como base64
      const logoUrl = '/6933620737_368c2eb1b7.jpg';
      const logoBase64 = await loadImageAsBase64(logoUrl);
      
      // ✅ Logo centrado en la parte superior
      doc.addImage(logoBase64, 'JPEG', 85, 5, 40, 20);
      
      // ✅ Nombre de la institución MÁS GRANDE
      doc.setFontSize(16);
      doc.setTextColor(0, 51, 102);
      doc.setFont('helvetica', 'bold');
      doc.text('INSTITUTO UNIVERSITARIO', 105, 32, { align: 'center' });
      doc.text('JESÚS OBRERO', 105, 40, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      
      // ✅ Marca de agua centrada en la página
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.06 }));
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const watermarkSize = 150;
      const centerX = (pageWidth - watermarkSize) / 2;
      const centerY = (pageHeight - watermarkSize) / 2;
      doc.addImage(logoBase64, 'JPEG', centerX, centerY, watermarkSize, watermarkSize, { angle: -35 });
      doc.restoreGraphicsState();
      
      // Título más pequeño
      doc.setFontSize(14);
      doc.setTextColor(80, 80, 80);
      doc.text(titulo, 105, 55, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Fecha de generación: ${fechaActual}`, 14, 65);
      doc.text(`Período: ${fechaInicio || 'Inicio'} - ${fechaFin || 'Fin'}`, 14, 72);
      
      let yOffset = 80;
    
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
    }
    
    doc.save(`reporte_${tipo}_${Date.now()}.pdf`);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error generando PDF: ' + error.message);
    }
  };

  const asistenciasFiltradas = filtrarDatos(asistencias);
  const inasistenciasFiltradas = filtrarDatos(inasistencias);

  if (cargando) return <div className="card">Cargando...</div>;

  return (
    <div>
      <div className="card">
        <h3 className="card-title">Reportes de Asistencia</h3>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input type="date" className="form-control border rounded p-2" style={{ width: 'auto' }} value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          <input type="date" className="form-control border rounded p-2" style={{ width: 'auto' }} value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
          <input type="text" className="form-control border rounded p-2" placeholder="Filtrar por docente..." value={filtroDocente} onChange={(e) => setFiltroDocente(e.target.value)} />
          <input type="text" className="form-control border rounded p-2" placeholder="Filtrar por carrera..." value={filtroCarrera} onChange={(e) => setFiltroCarrera(e.target.value)} />
          <button className="btn btn-secondary" onClick={cargarDatos}>Actualizar</button>
          <button className="btn btn-warning" onClick={() => { setFechaInicio(''); setFechaFin(''); setFiltroDocente(''); setFiltroCarrera(''); cargarDatos(); }}>Limpiar</button>
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