import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const GestionJustificativos = () => {
  const [justificativos, setJustificativos] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [formData, setFormData] = useState({
    id_asistencia: '',
    motivo: '',
    documento_url: ''
  });
  const [cargando, setCargando] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      if (user?.roles?.includes('profesor')) {
        const [justRes, asisRes] = await Promise.all([
          api.get('/justificativos/mis-justificativos'),
          api.get('/asistencias')
        ]);
        setJustificativos(justRes.data);
        setAsistencias(asisRes.data);
      } else if (user?.roles?.includes('coordinador')) {
        const res = await api.get('/justificativos/pendientes');
        setJustificativos(res.data);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/justificativos', formData);
      setFormData({ id_asistencia: '', motivo: '', documento_url: '' });
      setMostrarForm(false);
      cargarDatos();
    } catch (error) {
      console.error('Error guardando:', error);
    }
  };

  const handleAprobar = async (id) => {
    try {
      await api.put(`/justificativos/aprobar/${id}`);
      cargarDatos();
    } catch (error) {
      console.error('Error aprobando:', error);
    }
  };

  const handleRechazar = async (id) => {
    const obs = prompt('Motivo del rechazo:');
    if (obs !== null) {
      try {
        await api.put(`/justificativos/rechazar/${id}`, { observaciones: obs });
        cargarDatos();
      } catch (error) {
        console.error('Error rechazando:', error);
      }
    }
  };

  if (cargando) return <div className="card">Cargando...</div>;

  return (
    <>
      {user?.roles?.includes('profesor') && (
        <div className="card">
          <h3 className="card-title">Solicitar Justificativo</h3>
          {!mostrarForm ? (
            <button className="btn btn-primary" onClick={() => setMostrarForm(true)}>+ Nueva Solicitud</button>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <select className="form-control" value={formData.id_asistencia} onChange={(e) => setFormData({ ...formData, id_asistencia: e.target.value })} required>
                  <option value="">Seleccionar asistencia</option>
                  {asistencias.map(a => (
                    <option key={a.id_asistencia} value={a.id_asistencia}>
                      {new Date(a.fecha_entrada).toLocaleDateString()} - {a.nombre_asignatura}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <textarea className="form-control" rows="3" placeholder="Motivo del justificativo" value={formData.motivo} onChange={(e) => setFormData({ ...formData, motivo: e.target.value })} required />
              </div>
              <div className="form-group">
                <input type="text" className="form-control" placeholder="URL del documento (opcional)" value={formData.documento_url} onChange={(e) => setFormData({ ...formData, documento_url: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary">Enviar</button>
              <button type="button" className="btn btn-warning" style={{ marginLeft: '10px' }} onClick={() => setMostrarForm(false)}>Cancelar</button>
            </form>
          )}
        </div>
      )}

      <div className="card">
        <h3 className="card-title">{user?.roles?.includes('coordinador') ? 'Solicitudes Pendientes' : 'Mis Justificativos'}</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>Fecha</th><th>Asignatura</th><th>Motivo</th><th>Estado</th><th>Respuesta</th>{user?.roles?.includes('coordinador') && <th>Acciones</th>}</tr>
            </thead>
            <tbody>
              {justificativos.map(j => (
                <tr key={j.id_justificativo}>
                  <td>{new Date(j.fecha_solicitud).toLocaleDateString()}</td>
                  <td>{j.nombre_asignatura}</td>
                  <td>{j.motivo}</td>
                  <td><span className={`status-badge ${j.estado === 'aprobado' ? 'status-success' : j.estado === 'rechazado' ? 'status-danger' : 'status-warning'}`}>{j.estado}</span></td>
                  <td>{j.observaciones_coordinador || '-'}</td>
                  {user?.roles?.includes('coordinador') && j.estado === 'pendiente' && (
                    <td><button className="btn btn-success" style={{ marginRight: '5px' }} onClick={() => handleAprobar(j.id_justificativo)}>✅</button><button className="btn btn-danger" onClick={() => handleRechazar(j.id_justificativo)}>❌</button></td>
                  )}
                </tr>
              ))}
              {justificativos.length === 0 && <tr><td colSpan="6">No hay solicitudes</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default GestionJustificativos;