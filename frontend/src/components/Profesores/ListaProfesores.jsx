import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const ListaProfesores = () => {
  const [profesores, setProfesores] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarProfesores();
  }, []);

  const cargarProfesores = async () => {
    try {
      const response = await api.get('/profesores');
      setProfesores(response.data);
    } catch (error) {
      console.error('Error cargando profesores:', error);
    } finally {
      setCargando(false);
    }
  };

  if (cargando) {
    return <div className="card" style={{ textAlign: 'center' }}>Cargando profesores...</div>;
  }

  return (
    <div className="card">
      <h3 className="card-title">Lista de Profesores</h3>
      
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Cédula</th>
              <th>Correo</th>
              <th>Teléfono</th>
              <th>Carreras</th>
            </tr>
          </thead>
          <tbody>
            {profesores.map(prof => (
              <tr key={prof.id_profesor}>
                <td>{prof.id_profesor}</td>
                <td>{prof.nombre} {prof.apellido}</td>
                <td>{prof.cedula}</td>
                <td>{prof.correo}</td>
                <td>{prof.telefono}</td>
                <td>{prof.carreras?.join(', ') || 'Ninguna'}</td>
              </tr>
            ))}
            {profesores.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center' }}>No hay profesores registrados</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListaProfesores;