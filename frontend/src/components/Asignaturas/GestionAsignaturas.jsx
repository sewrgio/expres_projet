import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const GestionAsignaturas = () => {
  const [asignaturas, setAsignaturas] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [nombre, setNombre] = useState('');
  const [idCarrera, setIdCarrera] = useState('');
  const [editando, setEditando] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [asigRes, carrRes] = await Promise.all([
        api.get('/asignaturas'),
        api.get('/carreras')
      ]);
      setAsignaturas(asigRes.data);
      setCarreras(carrRes.data);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre || !idCarrera) return;

    try {
      if (editando) {
        await api.put(`/asignaturas/${editando}`, { nombre_asignatura: nombre, id_carrera: idCarrera });
      } else {
        await api.post('/asignaturas', { nombre_asignatura: nombre, id_carrera: idCarrera });
      }
      setNombre('');
      setIdCarrera('');
      setEditando(null);
      cargarDatos();
    } catch (error) {
      setError(error.response?.data?.error || 'Error al guardar');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleEdit = (asignatura) => {
    setNombre(asignatura.nombre_asignatura);
    setIdCarrera(asignatura.id_carrera);
    setEditando(asignatura.id_asignatura);
  };

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar esta asignatura?')) {
      try {
        await api.delete(`/asignaturas/${id}`);
        cargarDatos();
      } catch (error) {
        setError('Error al eliminar');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  if (cargando) return <div className="card">Cargando...</div>;

  return (
    <>
      <div className="card">
        <h3 className="card-title">{editando ? 'Editar Asignatura' : 'Nueva Asignatura'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              className="form-control"
              placeholder="Nombre de la asignatura"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <select
              className="form-control"
              value={idCarrera}
              onChange={(e) => setIdCarrera(e.target.value)}
              required
            >
              <option value="">Seleccionar carrera</option>
              {carreras.map(carr => (
                <option key={carr.id_carrera} value={carr.id_carrera}>
                  {carr.nombre_carrera}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary">
            {editando ? 'Actualizar' : 'Guardar'}
          </button>
          {editando && (
            <button type="button" className="btn btn-warning" style={{ marginLeft: '10px' }} onClick={() => {
              setNombre('');
              setIdCarrera('');
              setEditando(null);
            }}>
              Cancelar
            </button>
          )}
        </form>
        {error && <div style={{ marginTop: '10px', color: 'red' }}>{error}</div>}
      </div>

      <div className="card">
        <h3 className="card-title">Lista de Asignaturas</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>ID</th><th>Nombre</th><th>Carrera</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {asignaturas.map(asig => (
                <tr key={asig.id_asignatura}>
                  <td>{asig.id_asignatura}</td>
                  <td>{asig.nombre_asignatura}</td>
                  <td>{asig.nombre_carrera}</td>
                  <td>
                    <button className="btn btn-warning" style={{ marginRight: '5px' }} onClick={() => handleEdit(asig)}>✏️</button>
                    <button className="btn btn-danger" onClick={() => handleDelete(asig.id_asignatura)}>🗑️</button>
                  </td>
                </tr>
              ))}
              {asignaturas.length === 0 && (
                <tr><td colSpan="4" style={{ textAlign: 'center' }}>No hay asignaturas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default GestionAsignaturas;