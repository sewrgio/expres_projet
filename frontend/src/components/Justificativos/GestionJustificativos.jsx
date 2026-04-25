import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const GestionJustificativos = () => {
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
  const { user } = useAuth();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const profRes = await api.get('/profesores/todos');
      const todosLosProfesores = profRes.data;
      const miCarreraId = user?.id_carrera;
      const profesoresFiltrados = todosLosProfesores.filter(p => p.id_carrera === miCarreraId);
      setProfesores(profesoresFiltrados);

      if (user?.roles?.includes('auditor')) {
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

  const generarPDF = () => {
    const doc = new jsPDF();
    const title = tipoReporte === 'semanal' ? 'REPORTE SEMANAL DE JUSTIFICATIVOS' : 'REPORTE MENSUAL DE JUSTIFICATIVOS';
    doc.setFontSize(18);
    doc.text(title, 14, 20);
    doc.setFontSize(12);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 35);
    doc.text(`Período: ${fechaInicio || 'Inicio'} - ${fechaFin || 'Fin'}`, 14, 45);
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
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 55, theme: 'striped', headStyles: { fillColor: [0, 51, 102], textColor: 255 } });
    doc.save(`justificativos_${tipoReporte}_${Date.now()}.pdf`);
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
      {(user?.roles?.includes('profesor') || user?.roles?.includes('coordinador')) && !user?.roles?.includes('auditor') && (
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
                {(!user?.roles?.includes('profesor') || user?.roles?.includes('coordinador')) ? (
                  <>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '8px', display: 'block' }}>1. Buscar Profesor por Nombre:</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="🔍 Escribe nombre y apellido del profesor..."
                      value={busquedaProfesor}
                      onFocus={() => setMostrarListaProfesores(true)}
                      onChange={(e) => {
                        setBusquedaProfesor(e.target.value);
                        setMostrarListaProfesores(true);
                        if (profesorSeleccionado) {
                          setProfesorSeleccionado(null);
                          setAsistencias([]);
                          setFormData({ ...formData, id_asistencia: '' });
                          setBusquedaAsistencia('');
                        }
                      }}
                    />
                  </>
                ) : (
                  <div style={{ padding: '10px', backgroundColor: '#f0f7ff', borderRadius: '4px', marginBottom: '15px' }}>
                    <span style={{ fontSize: '13px', color: '#2980b9' }}>📋 Creando solicitud para: <strong>{user.nombre} {user.apellido}</strong></span>
                  </div>
                )}
                
                {mostrarListaProfesores && (
                  <div className="search-results" style={{ position: 'absolute', width: '100%', zIndex: 100, backgroundColor: 'white', maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', marginTop: '2px', boxShadow: '0 8px 16px rgba(0,0,0,0.15)' }}>
                    <div style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>
                      <button type="button" onClick={() => setMostrarListaProfesores(false)} style={{ background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', fontSize: '12px' }}>Cerrar lista ✕</button>
                    </div>
                    {profesores
                      .filter(p => `${p.nombre} ${p.apellido} ${p.correo}`.toLowerCase().includes(busquedaProfesor.toLowerCase()))
                      .map(p => (
                        <div
                          key={p.id_profesor}
                          className="search-item"
                          style={{ padding: '12px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                          onClick={() => {
                            buscarAsistenciasProfesor(p);
                            setMostrarListaProfesores(false);
                          }}
                        >
                          <div style={{ fontWeight: '600', color: '#2c3e50' }}>{p.nombre} {p.apellido}</div>
                          <div style={{ fontSize: '11px', color: '#7f8c8d' }}>{p.correo}</div>
                        </div>
                      ))}
                    {profesores.length === 0 && <div style={{ padding: '15px', color: '#999', textAlign: 'center' }}>No se encontraron profesores en tu carrera</div>}
                  </div>
                )}
                {profesorSeleccionado && (
                  <div style={{ marginTop: '10px' }}>
                    {(!user?.roles?.includes('profesor') || user?.roles?.includes('coordinador')) && (
                      <div style={{ fontSize: '13px', color: '#2ecc71', fontWeight: '500', marginBottom: '15px' }}>
                        ✅ Profesor seleccionado: <strong>{profesorSeleccionado.nombre} {profesorSeleccionado.apellido}</strong>
                      </div>
                    )}
                    
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '8px', display: 'block' }}>
                      {(!user?.roles?.includes('profesor') || user?.roles?.includes('coordinador')) ? '2.' : '1.'} Seleccionar Asistencia/Falta:
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="📅 Buscar por fecha o asignatura..."
                        value={busquedaAsistencia}
                        onFocus={() => setMostrarListaAsistencias(true)}
                        onChange={(e) => {
                          setBusquedaAsistencia(e.target.value);
                          setMostrarListaAsistencias(true);
                        }}
                      />
                      {mostrarListaAsistencias && (
                        <div className="search-results" style={{ position: 'absolute', width: '100%', zIndex: 90, backgroundColor: 'white', maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', marginTop: '2px', boxShadow: '0 8px 16px rgba(0,0,0,0.15)' }}>
                          {asistencias
                            .filter(a => 
                              new Date(a.fecha_entrada).toLocaleDateString().includes(busquedaAsistencia) || 
                              a.nombre_asignatura.toLowerCase().includes(busquedaAsistencia.toLowerCase())
                            )
                            .map(a => (
                              <div
                                key={a.id_asistencia}
                                className="search-item"
                                style={{ padding: '12px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                                onClick={() => {
                                  setFormData({ ...formData, id_asistencia: a.id_asistencia });
                                  setBusquedaAsistencia(`${new Date(a.fecha_entrada).toLocaleDateString()} - ${a.nombre_asignatura}`);
                                  setMostrarListaAsistencias(false);
                                }}
                              >
                                <strong>{new Date(a.fecha_entrada).toLocaleDateString()}</strong> - {a.nombre_asignatura}
                              </div>
                            ))}
                          {asistencias.length === 0 && <div style={{ padding: '15px', textAlign: 'center', color: '#999' }}>No hay registros de asistencia</div>}
                        </div>
                      )}
                    </div>
                  </div>
                )}
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

      {(user?.roles?.includes('coordinador') || user?.roles?.includes('auditor')) && (
        <div className="card">
          <h3 className="card-title">Reportes de Justificativos</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <select className="form-control" style={{ width: 'auto' }} value={tipoReporte} onChange={(e) => setTipoReporte(e.target.value)}>
              <option value="semanal">Reporte Semanal</option><option value="mensual">Reporte Mensual</option>
            </select>
            <input type="date" className="form-control" style={{ width: 'auto' }} value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            <input type="date" className="form-control" style={{ width: 'auto' }} value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            <button className="btn btn-primary" onClick={generarPDF}>📄 Generar PDF</button>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            {(user?.roles?.includes('coordinador') || user?.roles?.includes('auditor')) ? 'Solicitudes de Justificativos' : 'Mis Justificativos'}
          </h3>
          {(user?.roles?.includes('coordinador') || user?.roles?.includes('auditor')) && (
            <div style={{ position: 'relative', width: '300px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="🔍 Buscar profesor por nombre..."
                value={terminoBusquedaTabla}
                onChange={(e) => setTerminoBusquedaTabla(e.target.value)}
                style={{ paddingLeft: '35px' }}
              />
            </div>
          )}
        </div>
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Fecha</th><th>Profesor</th><th>Cédula</th><th>Carrera</th><th>Asignatura</th><th>Estado</th><th>Respuesta</th>{(user?.roles?.includes('coordinador') || user?.roles?.includes('auditor')) && <th>Acciones</th>}</tr></thead>
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
                    {(user?.roles?.includes('coordinador') || user?.roles?.includes('auditor')) && j.estado === 'pendiente' && (<td><button className="btn btn-success" style={{ marginRight: '5px' }} onClick={() => handleAprobar(j.id_justificativo)}>✅</button><button className="btn btn-danger" onClick={() => handleRechazar(j.id_justificativo)}>❌</button></td>)}
                  </tr>
                ))}
              {justificativos.length === 0 && <tr><td colSpan="7">No hay solicitudes</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default GestionJustificativos;