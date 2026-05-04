import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import CustomSelect from '../UI/CustomSelect';

const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const GestionHorarios = () => {
  const [horarios, setHorarios] = useState([]);
  const [asignaturasProfesores, setAsignaturasProfesores] = useState([]);
  const [formData, setFormData] = useState({
    id_asignatura_profesor: '',
    dia_semana: '',
    hora_inicio: '',
    hora_fin: '',
    aula: ''
  });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [horarioToDelete, setHorarioToDelete] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [horariosRes, asignaturasRes] = await Promise.all([
        api.get('/horarios'),
        api.get('/horarios/asignaturas-profesores')
      ]);
      setHorarios(horariosRes.data);
      setAsignaturasProfesores(asignaturasRes.data);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.id_asignatura_profesor || !formData.dia_semana || !formData.hora_inicio || !formData.hora_fin) {
      setError('Todos los campos son obligatorios');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      await api.post('/horarios', formData);
      setFormData({ id_asignatura_profesor: '', dia_semana: '', hora_inicio: '', hora_fin: '', aula: '' });
      cargarDatos();
    } catch (error) {
      setError('Error al guardar horario');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteClick = (horario) => {
    setHorarioToDelete(horario);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (horarioToDelete) {
      try {
        await api.delete(`/horarios/${horarioToDelete.id_horario}`);
        cargarDatos();
      } catch (error) {
        setError('Error al eliminar horario');
        setTimeout(() => setError(''), 3000);
      }
    }
    setShowDeleteModal(false);
    setHorarioToDelete(null);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setHorarioToDelete(null);
  };

  if (cargando) return <div className="card">Cargando...</div>;

  return (
    <>
      <div className="card">
        <h3 className="card-title">Asignar Horario</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <CustomSelect
              name="id_asignatura_profesor"
              value={formData.id_asignatura_profesor}
              onChange={(e) => setFormData({ ...formData, id_asignatura_profesor: e.target.value })}
              required
              placeholder="Seleccionar Asignatura - Profesor"
              options={asignaturasProfesores.map(ap => ({
                value: ap.id_asignatura_profesor,
                label: `${ap.nombre_asignatura} - ${ap.nombre} ${ap.apellido} (${ap.nombre_carrera})`
              }))}
            />
          </div>
          <div className="form-group">
            <CustomSelect
              name="dia_semana"
              value={formData.dia_semana}
              onChange={(e) => setFormData({ ...formData, dia_semana: e.target.value })}
              required
              placeholder="Seleccionar día"
              options={diasSemana.map(dia => ({ value: dia, label: dia }))}
            />
          </div>
          <div className="row">
            <div className="form-group">
              <input
                type="time"
                className="form-control"
                placeholder="Hora inicio"
                value={formData.hora_inicio}
                onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <input
                type="time"
                className="form-control"
                placeholder="Hora fin"
                value={formData.hora_fin}
                onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <input
              type="text"
              className="form-control"
              placeholder="Aula"
              value={formData.aula}
              onChange={(e) => setFormData({ ...formData, aula: e.target.value })}
            />
          </div>
          {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
          <button type="submit" className="btn btn-primary">Guardar Horario</button>
        </form>
      </div>

      <div className="card">
        <h3 className="card-title">Horarios Registrados</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Asignatura</th>
                <th>Profesor</th>
                <th>Día</th>
                <th>Hora</th>
                <th>Aula</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {horarios.map(h => (
                <tr key={h.id_horario}>
                  <td>{h.nombre_asignatura}</td>
                  <td>{h.nombre} {h.apellido}</td>
                  <td>{h.dia_semana}</td>
                  <td>{h.hora_inicio} - {h.hora_fin}</td>
                  <td>{h.aula || '-'}</td>
                  <td>
                    <button className="btn btn-danger" onClick={() => handleDeleteClick(h)}>
                      🗑️ Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {horarios.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center' }}>No hay horarios registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de confirmación para eliminar horario */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={handleCancelDelete}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">🗑️</div>
            <h3 className="modal-title">Eliminar Horario</h3>
            <p className="modal-message">
              ¿Estás seguro de que deseas eliminar el horario de <strong>"{horarioToDelete?.nombre_asignatura}"</strong>?
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
    </>
  );
};

export default GestionHorarios;