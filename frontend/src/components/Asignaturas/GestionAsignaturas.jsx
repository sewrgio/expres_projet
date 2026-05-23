import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import CustomSelect from '../UI/CustomSelect';

const GestionAsignaturas = () => {
  const [asignaturas, setAsignaturas] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [nombre, setNombre] = useState('');
  const [idCarrera, setIdCarrera] = useState('');
  const [editando, setEditando] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [asignaturaSeleccionada, setAsignaturaSeleccionada] = useState(null);
  const [profesorSeleccionado, setProfesorSeleccionado] = useState('');
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [asigRes, carrRes, profRes] = await Promise.all([
        api.get('/asignaturas'),
        api.get('/carreras'),
        api.get('/profesores/todos')
      ]);
      setAsignaturas(asigRes.data);
      setCarreras(carrRes.data);
      setProfesores(profRes.data);
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

  const handleAsignarProfesor = (asignatura) => {
    setAsignaturaSeleccionada(asignatura);
    setProfesorSeleccionado(asignatura.id_profesor || '');
    setShowModal(true);
  };

  const handleGuardarAsignacion = async () => {
    if (!profesorSeleccionado) {
      alert('Seleccione un profesor');
      return;
    }
    
    try {
      await api.post('/asignaturas/asignar-profesor', {
        id_asignatura: asignaturaSeleccionada.id_asignatura,
        id_profesor: profesorSeleccionado,
        fecha_desde: fechaInicio
      });
      setShowModal(false);
      cargarDatos();
      alert('Profesor asignado correctamente');
    } catch (error) {
      console.error('Error asignando profesor:', error);
      alert('Error al asignar profesor');
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
            <CustomSelect
              name="id_carrera"
              value={idCarrera}
              onChange={(val) => setIdCarrera(val)}
              required
              placeholder="Seleccionar carrera"
              options={carreras.map(carr => ({ value: carr.id_carrera, label: carr.nombre_carrera }))}
            />
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
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Carrera</th>
                <th>Profesor Asignado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {asignaturas.map(asig => (
                <tr key={asig.id_asignatura}>
                  <td>{asig.id_asignatura}</td>
                  <td>{asig.nombre_asignatura}</td>
                  <td>{asig.nombre_carrera}</td>
                  <td>
                    {asig.profesor_nombre ? `${asig.profesor_nombre} ${asig.profesor_apellido || ''}` : 'Sin asignar'}
                   </td>
                   <td>
                    <button className="btn btn-warning btn-sm" style={{ marginRight: '5px' }} onClick={() => handleEdit(asig)}>
                      ✏️
                    </button>
                    <button className="btn btn-info btn-sm" style={{ marginRight: '5px' }} onClick={() => handleAsignarProfesor(asig)}>
                      👨‍🏫
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(asig.id_asignatura)}>
                      🗑️
                    </button>
                   </td>
                 </tr>
              ))}
              {asignaturas.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center' }}>No hay asignaturas</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para asignar profesor */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Asignar Profesor</h3>
            <p><strong>Asignatura:</strong> {asignaturaSeleccionada?.nombre_asignatura}</p>
            
            <div className="form-group">
              <label>Profesor</label>
              <CustomSelect 
                name="id_profesor"
                value={profesorSeleccionado}
                onChange={(val) => setProfesorSeleccionado(val)}
                placeholder="Seleccionar profesor"
                options={profesores.map(prof => ({
                  value: prof.id_profesor,
                  label: `${prof.nombre} ${prof.apellido} - ${prof.correo}`
                }))}
              />
            </div>
            
            <div className="form-group">
              <label>Fecha de Inicio</label>
              <input 
                type="date" 
                className="form-control"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div className="modal-buttons">
              <button className="btn btn-primary" onClick={handleGuardarAsignacion}>
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
          min-width: 400px;
        }
        .modal-buttons {
          display: flex;
          gap: 10px;
          margin-top: 20px;
          justify-content: flex-end;
        }
        .btn-sm {
          padding: 5px 10px;
          font-size: 12px;
        }
        .btn-info {
          background-color: #17a2b8;
          color: white;
        }
        .btn-info:hover {
          background-color: #138496;
        }
      `}</style>
    </>
  );
};

export default GestionAsignaturas;