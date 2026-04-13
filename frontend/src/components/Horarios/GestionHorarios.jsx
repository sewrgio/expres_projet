import React, { useState, useEffect } from 'react';
import api from '../../services/api';

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

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      console.log('🔍 Cargando horarios...');
      const horariosRes = await api.get('/horarios');
      console.log('✅ Horarios response:', horariosRes.data);
      
      console.log('🔍 Cargando asignaturas-profesores...');
      const asignaturasRes = await api.get('/horarios/asignaturas-profesores');
      console.log('✅ Asignaturas response:', asignaturasRes.data);
      
      setHorarios(horariosRes.data);
      setAsignaturasProfesores(asignaturasRes.data);
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      console.error('❌ Detalle del error:', error.response);
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/horarios', formData);
      setFormData({ id_asignatura_profesor: '', dia_semana: '', hora_inicio: '', hora_fin: '', aula: '' });
      cargarDatos();
    } catch (error) {
      console.error('Error guardando:', error);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar este horario?')) {
      try {
        await api.delete(`/horarios/${id}`);
        cargarDatos();
      } catch (error) {
        console.error('Error eliminando:', error);
      }
    }
  };

  if (cargando) return <div className="card">Cargando...</div>;

  return (
    <>
      <div className="card">
        <h3 className="card-title">Asignar Horario</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <select
              className="form-control"
              value={formData.id_asignatura_profesor}
              onChange={(e) => setFormData({ ...formData, id_asignatura_profesor: e.target.value })}
              required
            >
              <option value="">Seleccionar Asignatura - Profesor</option>
              {asignaturasProfesores.map(ap => (
                <option key={ap.id_asignatura_profesor} value={ap.id_asignatura_profesor}>
                  {ap.nombre_asignatura} - {ap.nombre} {ap.apellido} ({ap.nombre_carrera})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <select
              className="form-control"
              value={formData.dia_semana}
              onChange={(e) => setFormData({ ...formData, dia_semana: e.target.value })}
              required
            >
              <option value="">Seleccionar día</option>
              {diasSemana.map(dia => (
                <option key={dia} value={dia}>{dia}</option>
              ))}
            </select>
          </div>
          <div className="row">
            <div className="form-group">
              <input
                type="time"
                className="form-control"
                value={formData.hora_inicio}
                onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <input
                type="time"
                className="form-control"
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
                  <td>{h.aula}</td>
                  <td><button className="btn btn-danger" onClick={() => handleDelete(h.id_horario)}>🗑️</button></td>
                </tr>
              ))}
              {horarios.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center' }}>No hay horarios</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default GestionHorarios;