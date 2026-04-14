import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const GestionInasistencias = () => {
  const [inasistencias, setInasistencias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [tipoReporte, setTipoReporte] = useState('semanal');

  useEffect(() => {
    cargarInasistencias();
  }, []);

  const cargarInasistencias = async () => {
    try {
      const response = await api.get('/asistencias/faltas');
      setInasistencias(response.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setCargando(false);
    }
  };

  const generarPDF = () => {
    const doc = new jsPDF();
    const title = tipoReporte === 'semanal' ? 'REPORTE SEMANAL DE INASISTENCIAS' : 'REPORTE MENSUAL DE INASISTENCIAS';
    
    doc.setFontSize(18);
    doc.text(title, 14, 20);
    doc.setFontSize(12);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 35);
    doc.text(`Período: ${fechaInicio || 'Inicio'} - ${fechaFin || 'Fin'}`, 14, 45);
    
    const tableColumn = ["Profesor", "Fecha", "Asignatura", "Tipo", "Justificado"];
    const tableRows = inasistencias.map(inasistencia => [
      inasistencia.profesor_nombre,
      new Date(inasistencia.fecha_clase).toLocaleDateString(),
      inasistencia.asignatura,
      inasistencia.tipo_falta || 'Injustificada',
      inasistencia.justificado ? 'Sí' : 'No'
    ]);
    
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 55,
      theme: 'striped',
      headStyles: { fillColor: [0, 51, 102], textColor: 255 },
    });
    
    doc.save(`inasistencias_${tipoReporte}_${Date.now()}.pdf`);
  };

  if (cargando) return <div className="card">Cargando...</div>;

  return (
    <div className="card">
      <h3 className="card-title">Gestión de Inasistencias</h3>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select 
          className="form-control" 
          style={{ width: 'auto' }}
          value={tipoReporte}
          onChange={(e) => setTipoReporte(e.target.value)}
        >
          <option value="semanal">Reporte Semanal</option>
          <option value="mensual">Reporte Mensual</option>
        </select>
        <input type="date" className="form-control" style={{ width: 'auto' }} value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
        <input type="date" className="form-control" style={{ width: 'auto' }} value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
        <button className="btn btn-primary" onClick={generarPDF}>📄 Generar PDF</button>
        <button className="btn btn-success" onClick={cargarInasistencias}>Actualizar</button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr><th>Profesor</th><th>Fecha</th><th>Asignatura</th><th>Tipo</th><th>Justificado</th></tr>
          </thead>
          <tbody>
            {inasistencias.map(inasistencia => (
              <tr key={inasistencia.id_falta}>
                <td>{inasistencia.profesor_nombre}</td>
                <td>{new Date(inasistencia.fecha_clase).toLocaleDateString()}</td>
                <td>{inasistencia.asignatura}</td>
                <td><span className="status-badge status-danger">{inasistencia.tipo_falta || 'Injustificada'}</span></td>
                <td>{inasistencia.justificado ? '✅ Sí' : '❌ No'}</td>
              </tr>
            ))}
            {inasistencias.length === 0 && <tr><td colSpan="5">No hay inasistencias registradas</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GestionInasistencias;