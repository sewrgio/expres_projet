import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CustomSelect from '../UI/CustomSelect';

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

const GestionJustificativos = () => {
  const location = useLocation();
  const [justificativos, setJustificativos] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [tipoReporte, setTipoReporte] = useState('semanal');
  const [formData, setFormData] = useState({ id_asistencia: '', documento_url: '', fecha_man: '', id_asignatura: '' });
  const [asignaturas, setAsignaturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [terminoBusquedaTabla, setTerminoBusquedaTabla] = useState('');
  const [profesores, setProfesores] = useState([]);
  const [busquedaProfesor, setBusquedaProfesor] = useState('');
  const [profesorSeleccionado, setProfesorSeleccionado] = useState(null);
  const [mostrarListaProfesores, setMostrarListaProfesores] = useState(false);
  const [busquedaAsistencia, setBusquedaAsistencia] = useState('');
  const [mostrarListaAsistencias, setMostrarListaAsistencias] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const { user } = useAuth();

  const esVistaProfesores = location.pathname === '/justificativos-profesores';

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const profRes = await api.get('/profesores/todos');
      const todosLosProfesores = profRes.data;
      const miCarreraId = user?.id_carrera;
      const profesoresFiltrados = todosLosProfesores.filter(p => p.id_carrera === miCarreraId);
      setProfesores(profesoresFiltrados);

      if (esVistaProfesores) {
        // Vista de justificativos de profesores (solo coordinadores)
        const justRes = await api.get('/justificativos/pendientes');
        setJustificativos(justRes.data);
      } else if (user?.roles?.includes('auditor')) {
        const justRes = await api.get('/justificativos');
        setJustificativos(justRes.data);
      } else if (user?.roles?.includes('coordinador')) {
        const justRes = await api.get('/justificativos/pendientes');
        setJustificativos(justRes.data);
      } else if (user?.roles?.includes('profesor')) {
        const [justRes, asisRes, asigRes] = await Promise.all([
          api.get('/justificativos/mis-justificativos'),
          api.get('/asistencias'),
          api.get('/asignaturas/mis-asignaturas')
        ]);
        setJustificativos(justRes.data);
        setAsistencias(asisRes.data);
        setAsignaturas(asigRes.data || []);
      }
    } catch (error) { console.error(error); } finally { setCargando(false); }
  };

  const buscarAsistenciasProfesor = async (profesor) => {
    if (!profesor) return;
    try {
      const res = await api.get(`/asistencias/profesor/${profesor.id_profesor}`);
      setAsistencias(res.data);
      setProfesorSeleccionado(profesor);
      setBusquedaProfesor(`${profesor.nombre} ${profesor.apellido}`);
    } catch (error) { console.error(error); }
  };

  const buscarProfesorBD = async (termino) => {
    if (!termino || termino.length < 2) {
      setResultadosBusqueda([]);
      return;
    }
    setBuscando(true);
    try {
      const res = await api.get(`/profesores/buscar?q=${encodeURIComponent(termino)}`);
      setResultadosBusqueda(res.data);
    } catch (error) {
      console.error('Error buscando profesor:', error);
      setResultadosBusqueda([]);
    } finally {
      setBuscando(false);
    }
  };

  const generarPDF = async () => {
    try {
      const doc = new jsPDF();
      const title = tipoReporte === 'semanal' ? 'REPORTE SEMANAL DE JUSTIFICATIVOS' : 'REPORTE MENSUAL DE JUSTIFICATIVOS';
      
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
      doc.text(title, 105, 55, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 65);
      doc.text(`Período: ${fechaInicio || 'Inicio'} - ${fechaFin || 'Fin'}`, 14, 72);
      const tableColumn = ["Profesor", "Cédula", "Carrera", "Fecha", "Asignatura", "Estado"];
      let dataParaPdf = justificativos;
    const tableRows = dataParaPdf.map(j => [
      `${j.nombre || 'N/A'} ${j.apellido || ''}`,
      j.cedula || 'N/A',
      j.nombre_carrera || 'N/A',
      new Date(j.fecha_solicitud).toLocaleDateString(),
      j.nombre_asignatura || 'N/A',
      j.estado
    ]);
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 80, theme: 'striped', headStyles: { fillColor: [0, 51, 102], textColor: 255 } });
    doc.save(`justificativos_${tipoReporte}_${Date.now()}.pdf`);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error generando PDF: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      data.append('id_asistencia', formData.id_asistencia);
      if (archivo) {
        data.append('documento', archivo);
      } else {
        data.append('documento_url', formData.documento_url);
      }
      await api.post('/justificativos', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFormData({ id_asistencia: '', documento_url: '' });
      setArchivo(null);
      setMostrarForm(false);
      cargarDatos();
    } catch (error) { console.error(error); alert('Error al enviar el justificativo'); }
  };

  const handleAprobar = async (id) => { try { await api.put(`/justificativos/aprobar/${id}`); cargarDatos(); } catch (error) { console.error(error); } };
  const handleRechazar = async (id) => { const obs = prompt('Motivo del rechazo:'); if (obs) { try { await api.put(`/justificativos/rechazar/${id}`, { observaciones: obs }); cargarDatos(); } catch (error) { console.error(error); } } };

  if (cargando) return <div className="card">Cargando...</div>;

  return (
    <>
      {!esVistaProfesores && (user?.roles?.includes('profesor') || user?.roles?.includes('coordinador')) && !user?.roles?.includes('auditor') && (
        <div className="card">
          <h3 className="card-title">Solicitar Justificativo</h3>
          {!mostrarForm ? (
            <button className="btn btn-primary" onClick={() => {
              setMostrarForm(true);
              if (user?.roles?.includes('profesor') && !user?.roles?.includes('coordinador')) {
                  const miProf = profesores.find(p => p.id_usuario === user.id_usuario);
                  if (miProf) { buscarAsistenciasProfesor(miProf); }
              }
            }}>Agregar</button>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ position: 'relative' }}>
                <div style={{ padding: '10px', backgroundColor: '#f0f7ff', borderRadius: '4px', marginBottom: '15px' }}>
                  <span style={{ fontSize: '13px', color: '#2980b9' }}>📋 Creando solicitud para: <strong>{user.nombre} {user.apellido}</strong></span>
                </div>
              </div>
              <div className="form-group">
                <div className="file-upload-wrapper" style={{ border: '2px dashed #ddd', borderRadius: '8px', padding: '20px', textAlign: 'center', backgroundColor: '#f9f9f9', transition: 'all 0.3s' }}>
                  <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>📁</div>
                    <div style={{ fontWeight: '600', color: '#555' }}>
                      {archivo ? archivo.name : 'Haz clic para subir imagen o PDF'}
                    </div>
                  </label>
                  <input id="file-upload" type="file" className="form-control" style={{ display: 'none' }} accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setArchivo(e.target.files[0])} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">Enviar</button>
              <button type="button" className="btn btn-warning" style={{ marginLeft: '10px' }} onClick={() => setMostrarForm(false)}>Cancelar</button>
            </form>
          )}
        </div>
      )}

      {!esVistaProfesores && (
        <div className="card">
          <h3 className="card-title">Datos del Usuario</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <strong>Nombre:</strong> {user?.nombre}
            </div>
            <div>
              <strong>Apellido:</strong> {user?.apellido}
            </div>
            <div>
              <strong>Cédula:</strong> {user?.cedula || 'No disponible'}
            </div>
            <div>
              <strong>Correo:</strong> {user?.correo}
            </div>
            <div>
              <strong>Teléfono:</strong> {user?.telefono || 'No disponible'}
            </div>
            <div>
              <strong>Carrera:</strong> {user?.nombre_carrera || 'No disponible'}
            </div>
            <div>
              <strong>Rol:</strong> {user?.roles?.join(', ') || user?.rol || 'No disponible'}
            </div>
          </div>
        </div>
      )}

      {esVistaProfesores && (user?.roles?.includes('coordinador') || user?.roles?.includes('auditor')) && (
        <div className="card">
          <h3 className="card-title">Reportes de Justificativos</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ width: '200px' }}>
              <CustomSelect 
                name="tipoReporte"
                value={tipoReporte} 
                onChange={(e) => setTipoReporte(e.target.value)}
                options={[
                  { value: 'semanal', label: 'Reporte Semanal' },
                  { value: 'mensual', label: 'Reporte Mensual' }
                ]}
              />
            </div>
            <input type="date" className="form-control" style={{ width: 'auto' }} value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            <input type="date" className="form-control" style={{ width: 'auto' }} value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            <button className="btn btn-primary" onClick={generarPDF}>📄 Generar PDF</button>
          </div>
        </div>
      )}

      {/* Tabla para profesor viendo sus propios justificativos */}
      {!esVistaProfesores && user?.roles?.includes('profesor') && !user?.roles?.includes('coordinador') && !user?.roles?.includes('auditor') && (
        <div className="card">
          <h3 className="card-title">Mis Justificativos</h3>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Fecha</th><th>Asignatura</th><th>Estado</th></tr></thead>
              <tbody>
                {justificativos.map(j => (
                  <tr key={j.id_justificativo}>
                    <td>{new Date(j.fecha_solicitud).toLocaleDateString()}</td>
                    <td>{j.nombre_asignatura || '-'}</td>
                    <td><span className={`status-badge ${j.estado === 'aprobado' ? 'status-success' : j.estado === 'rechazado' ? 'status-danger' : 'status-warning'}`}>{j.estado}</span></td>
                  </tr>
                ))}
                {justificativos.length === 0 && <tr><td colSpan="3">No tienes justificativos registrados</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {esVistaProfesores && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 className="card-title" style={{ margin: 0 }}>
              Justificativos de Profesores
            </h3>
            <div style={{ position: 'relative', width: '300px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="🔍 Buscar profesor por nombre..."
                value={terminoBusquedaTabla}
                onChange={(e) => {
                  setTerminoBusquedaTabla(e.target.value);
                  buscarProfesorBD(e.target.value);
                }}
                style={{ paddingLeft: '35px' }}
              />
              {resultadosBusqueda.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  marginTop: '5px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  {resultadosBusqueda.map(prof => (
                    <div
                      key={prof.id_profesor}
                      onClick={() => {
                        setTerminoBusquedaTabla(`${prof.nombre} ${prof.apellido}`);
                        setResultadosBusqueda([]);
                        buscarAsistenciasProfesor(prof);
                      }}
                      style={{
                        padding: '10px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #eee',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f7ff'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                    >
                      <strong>{prof.nombre} {prof.apellido}</strong>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {prof.cedula} - {prof.nombre_carrera}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {buscando && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  marginTop: '5px',
                  padding: '10px',
                  textAlign: 'center',
                  color: '#666',
                  zIndex: 1000
                }}>
                  Buscando...
                </div>
              )}
            </div>
          </div>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Fecha</th><th>Profesor</th><th>Cédula</th><th>Carrera</th><th>Asignatura</th><th>Estado</th><th>Respuesta</th><th>Acciones</th></tr></thead>
              <tbody>
                {justificativos
                  .filter(j => {
                    const termino = terminoBusquedaTabla.toLowerCase();
                    return (
                      (j.nombre && j.nombre.toLowerCase().includes(termino)) ||
                      (j.apellido && j.apellido.toLowerCase().includes(termino)) ||
                      (j.nombre_asignatura && j.nombre_asignatura.toLowerCase().includes(termino)) ||
                      (j.cedula && j.cedula.toLowerCase().includes(termino)) ||
                      (j.nombre_carrera && j.nombre_carrera.toLowerCase().includes(termino))
                    );
                  })
                  .map(j => (
                    <tr key={j.id_justificativo}>
                      <td>{new Date(j.fecha_solicitud).toLocaleDateString()}</td>
                      <td><strong>{j.nombre} {j.apellido}</strong></td>
                      <td>{j.cedula || '-'}</td>
                      <td>{j.nombre_carrera || '-'}</td>
                      <td>{j.nombre_asignatura}</td>
                      <td><span className={`status-badge ${j.estado === 'aprobado' ? 'status-success' : j.estado === 'rechazado' ? 'status-danger' : 'status-warning'}`}>{j.estado}</span></td>
                      <td>{j.observaciones_coordinador || '-'}</td>
                      {j.estado === 'pendiente' && (<td><button className="btn btn-success" style={{ marginRight: '5px' }} onClick={() => handleAprobar(j.id_justificativo)}>✅</button><button className="btn btn-danger" onClick={() => handleRechazar(j.id_justificativo)}>❌</button></td>)}
                    </tr>
                  ))}
                {justificativos.length === 0 && <tr><td colSpan="8">No hay solicitudes</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default GestionJustificativos;