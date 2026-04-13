import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const GestionCarreras = () => {
  const [carreras, setCarreras] = useState([]);
  const [nombre, setNombre] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [editando, setEditando] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  useEffect(() => {
    cargarCarreras();
  }, []);

  const cargarCarreras = async () => {
    try {
      const response = await api.get('/carreras');
      setCarreras(response.data);
    } catch (error) {
      console.error('Error cargando carreras:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    
    try {
      if (editando) {
        await api.put(`/carreras/${editando.id_carrera}`, { 
          nombre_carrera: nombre,
          activo: true
        });
      } else {
        await api.post('/carreras', { nombre_carrera: nombre });
      }
      setNombre('');
      setEditando(null);
      setMostrarForm(false);
      cargarCarreras();
    } catch (error) {
      setError(error.response?.data?.error || 'Error al guardar carrera');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleEdit = (carrera) => {
    setEditando(carrera);
    setNombre(carrera.nombre_carrera);
    setMostrarForm(true);
  };

  const handleDelete = async (id, nombreCarrera) => {
    if (window.confirm(`¿Eliminar la carrera "${nombreCarrera}"?`)) {
      try {
        await api.delete(`/carreras/${id}`);
        cargarCarreras();
      } catch (error) {
        setError(error.response?.data?.error || 'Error al eliminar carrera');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const handleCancel = () => {
    setEditando(null);
    setNombre('');
    setMostrarForm(false);
    setError('');
  };

  if (cargando) {
    return <div className="card" style={{ textAlign: 'center' }}>Cargando carreras...</div>;
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 className="page-title">Gestión de Carreras</h2>
        {!mostrarForm && (
          <button className="btn btn-primary" onClick={() => setMostrarForm(true)}>
            + Nueva Carrera
          </button>
        )}
      </div>

      {mostrarForm && (
        <div className="card">
          <h3 className="card-title">{editando ? 'Editar Carrera' : 'Agregar Nueva Carrera'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                type="text"
                className="form-control"
                placeholder="Nombre de la carrera"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary">
                {editando ? 'Actualizar' : 'Agregar'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                Cancelar
              </button>
            </div>
          </form>
          {error && <div style={{ marginTop: '10px', color: 'red' }}>{error}</div>}
        </div>
      )}

      <div className="card">
        <h3 className="card-title">Lista de Carreras</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {carreras.map(carr => (
                <tr key={carr.id_carrera}>
                  <td>{carr.id_carrera}</td>
                  <td>{carr.nombre_carrera}</td>
                  <td>
                    <button 
                      className="btn btn-warning btn-sm" 
                      onClick={() => handleEdit(carr)}
                      style={{ marginRight: '5px' }}
                    >
                      ✏️ Editar
                    </button>
                    <button 
                      className="btn btn-danger btn-sm" 
                      onClick={() => handleDelete(carr.id_carrera, carr.nombre_carrera)}
                    >
                      🗑️ Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {carreras.length === 0 && (
                <tr><td colSpan="3" style={{ textAlign: 'center' }}>No hay carreras registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default GestionCarreras;