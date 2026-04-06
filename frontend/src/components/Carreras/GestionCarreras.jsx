import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const GestionCarreras = () => {
  const [carreras, setCarreras] = useState([]);
  const [nombre, setNombre] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

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
      await api.post('/carreras', { nombre_carrera: nombre });
      setNombre('');
      cargarCarreras();
    } catch (error) {
      setError(error.response?.data?.error || 'Error al crear carrera');
      setTimeout(() => setError(''), 3000);
    }
  };

  if (cargando) {
    return <div className="card" style={{ textAlign: 'center' }}>Cargando carreras...</div>;
  }

  return (
    <>
      <div className="card">
        <h3 className="card-title">Agregar Nueva Carrera</h3>
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
          <button type="submit" className="btn btn-primary">Agregar Carrera</button>
        </form>
        {error && <div style={{ marginTop: '10px', color: 'red' }}>{error}</div>}
      </div>

      <div className="card">
        <h3 className="card-title">Lista de Carreras</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>ID</th><th>Nombre</th></tr>
            </thead>
            <tbody>
              {carreras.map(carr => (
                <tr key={carr.id_carrera}>
                  <td>{carr.id_carrera}</td>
                  <td>{carr.nombre_carrera}</td>
                </tr>
              ))}
              {carreras.length === 0 && (
                <tr><td colSpan="2" style={{ textAlign: 'center' }}>No hay carreras registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default GestionCarreras;