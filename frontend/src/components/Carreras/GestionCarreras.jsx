import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const GestionCarreras = () => {
  const [carreras, setCarreras] = useState([]);
  const [nombre, setNombre] = useState('');
  const [editando, setEditando] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [carreraToDelete, setCarreraToDelete] = useState(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    if (editando) {
      setShowEditModal(true);
      return;
    }

    try {
      await api.post('/carreras', { nombre_carrera: nombre });
      setNombre('');
      cargarCarreras();
    } catch (error) {
      setError(error.response?.data?.error || 'Error al guardar');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleConfirmEdit = async () => {
    try {
      await api.put(`/carreras/${editando}`, { nombre_carrera: nombre });
      setEditando(null);
      setNombre('');
      setShowEditModal(false);
      cargarCarreras();
    } catch (error) {
      setError(error.response?.data?.error || 'Error al actualizar');
      setTimeout(() => setError(''), 3000);
      setShowEditModal(false);
    }
  };

  const handleCancelEditModal = () => {
    setShowEditModal(false);
  };

  const handleEdit = (carrera) => {
    setEditando(carrera.id_carrera);
    setNombre(carrera.nombre_carrera);
  };

  const handleDeleteClick = (carrera) => {
    setCarreraToDelete(carrera);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (carreraToDelete) {
      try {
        await api.delete(`/carreras/${carreraToDelete.id_carrera}`);
        cargarCarreras();
      } catch (error) {
        setError('Error al eliminar carrera');
        setTimeout(() => setError(''), 3000);
      }
    }
    setShowDeleteModal(false);
    setCarreraToDelete(null);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setCarreraToDelete(null);
  };

  const cancelEdit = () => {
    setEditando(null);
    setNombre('');
  };

  if (cargando) {
    return <div className="card" style={{ textAlign: 'center' }}>Cargando carreras...</div>;
  }

  return (
    <>
      <div className="card">
        <h3 className="card-title">{editando ? 'Editar Carrera' : 'Nueva Carrera'}</h3>
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
          <button type="submit" className="btn btn-primary">
            {editando ? 'Actualizar' : 'Agregar Carrera'}
          </button>
          {editando && (
            <button type="button" className="btn btn-warning" style={{ marginLeft: '10px' }} onClick={cancelEdit}>
              Cancelar
            </button>
          )}
        </form>
        {error && <div style={{ marginTop: '10px', color: 'red' }}>{error}</div>}
      </div>

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
                    <button className="btn btn-warning" style={{ marginRight: '5px' }} onClick={() => handleEdit(carr)}>
                      ✏️ Editar
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDeleteClick(carr)}>
                      🗑️ Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {carreras.length === 0 && (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center' }}>No hay carreras registradas</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de confirmación para eliminar carrera */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={handleCancelDelete}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">🗑️</div>
            <h3 className="modal-title">Eliminar Carrera</h3>
            <p className="modal-message">
              ¿Estás seguro de que deseas eliminar la carrera <strong>"{carreraToDelete?.nombre_carrera}"</strong>?
            </p>
            <div className="modal-buttons">
              <button className="modal-btn modal-btn-cancel" onClick={handleCancelDelete}>
                Cancelar
              </button>
              <button className="modal-btn modal-btn-confirm" onClick={handleConfirmDelete}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para editar carrera */}
      {showEditModal && (
        <div className="modal-overlay" onClick={handleCancelEditModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">✏️</div>
            <h3 className="modal-title">Editar Carrera</h3>
            <p className="modal-message">
              ¿Estás seguro de que deseas guardar los cambios realizados en esta carrera?
            </p>
            <div className="modal-buttons">
              <button className="modal-btn modal-btn-cancel" onClick={handleCancelEditModal}>
                Cancelar
              </button>
              <button className="modal-btn modal-btn-confirm" onClick={handleConfirmEdit}>
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GestionCarreras;