import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const ListaProfesores = () => {
  const [profesores, setProfesores] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [profesorSeleccionado, setProfesorSeleccionado] = useState(null);
  const [nuevaCarrera, setNuevaCarrera] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [profesoresRes, carrerasRes] = await Promise.all([
        api.get('/profesores'),
        api.get('/carreras')
      ]);
      setProfesores(profesoresRes.data);
      setCarreras(carrerasRes.data);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleEditarCarrera = (profesor) => {
    setProfesorSeleccionado(profesor);
    setNuevaCarrera(profesor.id_carrera || '');
    setShowModal(true);
  };

  const handleGuardarCarrera = async () => {
    if (!nuevaCarrera) return;
    
    try {
      await api.put(`/profesores/${profesorSeleccionado.id_profesor}/carrera`, {
        carrera_id: nuevaCarrera
      });
      setShowModal(false);
      cargarDatos();
    } catch (error) {
      console.error('Error actualizando carrera:', error);
      alert('Error al actualizar la carrera');
    }
  };

  if (cargando) {
    return <div className="card" style={{ textAlign: 'center' }}>Cargando profesores...</div>;
  }

  return (
    <>
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
                <th>Carrera</th>
                <th>Acciones</th>
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
                  <td>{prof.nombre_carrera || 'Sin asignar'}</td>
                  <td>
                    <button 
                      className="btn btn-warning btn-sm" 
                      onClick={() => handleEditarCarrera(prof)}
                    >
                      📌 Editar Carrera
                    </button>
                  </td>
                </tr>
              ))}
              {profesores.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center' }}>No hay profesores registrados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para editar carrera */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Editar Carrera</h3>
            <p><strong>Profesor:</strong> {profesorSeleccionado?.nombre} {profesorSeleccionado?.apellido}</p>
            <div className="form-group">
              <label>Carrera</label>
              <select 
                className="form-control"
                value={nuevaCarrera}
                onChange={(e) => setNuevaCarrera(e.target.value)}
              >
                <option value="">Seleccionar carrera</option>
                {carreras.map(carr => (
                  <option key={carr.id_carrera} value={carr.id_carrera}>
                    {carr.nombre_carrera}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-buttons">
              <button className="btn btn-primary" onClick={handleGuardarCarrera}>
                Guardar
              </button>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          padding: 25px;
          border-radius: 12px;
          min-width: 350px;
        }
        .modal-buttons {
          display: flex;
          gap: 10px;
          margin-top: 20px;
          justify-content: flex-end;
        }
      `}</style>
    </>
  );
};

export default ListaProfesores;