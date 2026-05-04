import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import CustomSelect from '../UI/CustomSelect';

const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const GestionAsignaturasHorarios = () => {
  const { user } = useAuth();
  const [asignaturas, setAsignaturas] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [asignaturasProfesores, setAsignaturasProfesores] = useState([]);
  
  // Formulario de asignatura
  const [nombreAsignatura, setNombreAsignatura] = useState('');
  const [idCarrera, setIdCarrera] = useState('');
  const [editandoAsignatura, setEditandoAsignatura] = useState(null);
  
  // Formulario de horario
  const [formDataHorario, setFormDataHorario] = useState({
    id_asignatura_profesor: '',
    dia_semana: '',
    hora_inicio: '',
    hora_fin: '',
    aula: ''
  });
  
  // Modales
  const [showModalAsignarProfesor, setShowModalAsignarProfesor] = useState(false);
  const [showModalConfirmacion, setShowModalConfirmacion] = useState(false);
  const [asignaturaSeleccionada, setAsignaturaSeleccionada] = useState(null);
  const [profesorSeleccionado, setProfesorSeleccionado] = useState('');
  const [profesorSeleccionadoData, setProfesorSeleccionadoData] = useState(null);
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  
  // Buscador de profesores
  const [busquedaProfesor, setBusquedaProfesor] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [buscandoProfesor, setBuscandoProfesor] = useState(false);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [asignaturaExpandida, setAsignaturaExpandida] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, [user]);

  const cargarDatos = async () => {
    try {
      const [asigRes, carrRes, profRes, horRes, asignProfRes] = await Promise.all([
        api.get('/asignaturas'),
        api.get('/carreras'),
        api.get('/profesores/todos'),
        api.get('/horarios'),
        api.get('/horarios/asignaturas-profesores')
      ]);
      // Filtrar por carrera del coordinador si aplica
      const esCoordinador = user?.roles?.includes('coordinador');
      const esAuditor = user?.roles?.includes('auditor');
      const idCarreraCoordinador = user?.id_carrera;

      let asignaturasFiltradas = asigRes.data;
      let profesoresFiltrados = profRes.data;
      let carrerasFiltradas = carrRes.data;

      if (esCoordinador && !esAuditor && idCarreraCoordinador) {
        // Filtrar asignaturas por carrera del coordinador
        asignaturasFiltradas = asigRes.data.filter(a => a.id_carrera === idCarreraCoordinador);
        // Filtrar profesores por carrera
        profesoresFiltrados = profRes.data.filter(p => p.id_carrera === idCarreraCoordinador);
        // Filtrar carreras para solo mostrar la del coordinador
        carrerasFiltradas = carrRes.data.filter(c => c.id_carrera === idCarreraCoordinador);
      }

      // Filtrar asignaturas-profesores por carrera del coordinador
      let asignaturasProfesoresFiltradas = asignProfRes.data;
      let horariosFiltrados = horRes.data;
      if (esCoordinador && !esAuditor && idCarreraCoordinador) {
        asignaturasProfesoresFiltradas = asignProfRes.data.filter(ap => ap.id_carrera === idCarreraCoordinador);
        // Filtrar horarios que corresponden a asignaturas de la carrera del coordinador
        horariosFiltrados = horRes.data.filter(h => h.id_carrera === idCarreraCoordinador);
      }

      setAsignaturas(asignaturasFiltradas);
      setCarreras(carrerasFiltradas);
      setProfesores(profesoresFiltrados);
      setHorarios(horariosFiltrados);
      setAsignaturasProfesores(asignaturasProfesoresFiltradas);

      // Auto-asignar carrera del coordinador si es coordinador
      if (esCoordinador && !esAuditor && idCarreraCoordinador && !editandoAsignatura) {
        setIdCarrera(idCarreraCoordinador.toString());
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setCargando(false);
    }
  };

  // CRUD Asignaturas
  const handleSubmitAsignatura = async (e) => {
    e.preventDefault();
    if (!nombreAsignatura || !idCarrera) return;

    try {
      if (editandoAsignatura) {
        await api.put(`/asignaturas/${editandoAsignatura}`, { nombre_asignatura: nombreAsignatura, id_carrera: idCarrera });
      } else {
        await api.post('/asignaturas', { nombre_asignatura: nombreAsignatura, id_carrera: idCarrera });
      }
      setNombreAsignatura('');
      setIdCarrera('');
      setEditandoAsignatura(null);
      cargarDatos();
    } catch (error) {
      setError(error.response?.data?.error || 'Error al guardar');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleEditAsignatura = (asignatura) => {
    setNombreAsignatura(asignatura.nombre_asignatura);
    setIdCarrera(asignatura.id_carrera);
    setEditandoAsignatura(asignatura.id_asignatura);
  };

  const handleDeleteAsignatura = async (id) => {
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
    setProfesorSeleccionado('');
    setProfesorSeleccionadoData(null);
    setBusquedaProfesor('');
    setResultadosBusqueda([]);
    setMostrarResultados(false);
    setShowModalAsignarProfesor(true);
  };

  // Buscar profesores en la base de datos
  const buscarProfesores = async (termino) => {
    if (!termino || termino.length < 2) {
      setResultadosBusqueda([]);
      return;
    }
    
    setBuscandoProfesor(true);
    try {
      const response = await api.get(`/profesores/buscar?q=${encodeURIComponent(termino)}`);
      setResultadosBusqueda(response.data);
      setMostrarResultados(true);
    } catch (error) {
      console.error('Error buscando profesores:', error);
      setResultadosBusqueda([]);
    } finally {
      setBuscandoProfesor(false);
    }
  };

  // Seleccionar profesor de los resultados
  const seleccionarProfesor = (profesor) => {
    setProfesorSeleccionado(profesor.id_profesor.toString());
    setProfesorSeleccionadoData(profesor);
    setBusquedaProfesor(`${profesor.nombre} ${profesor.apellido} - ${profesor.cedula || profesor.correo}`);
    setMostrarResultados(false);
  };

  const handleGuardarAsignacion = () => {
    if (!profesorSeleccionado || !profesorSeleccionadoData) {
      alert('Seleccione un profesor de la búsqueda');
      return;
    }
    // Mostrar modal de confirmación
    setShowModalConfirmacion(true);
  };

  const confirmarAsignacion = async () => {
    try {
      await api.post('/asignaturas/asignar-profesor', {
        id_asignatura: asignaturaSeleccionada.id_asignatura,
        id_profesor: profesorSeleccionado,
        fecha_desde: fechaInicio
      });
      setShowModalAsignarProfesor(false);
      setShowModalConfirmacion(false);
      setBusquedaProfesor('');
      setResultadosBusqueda([]);
      setProfesorSeleccionadoData(null);
      cargarDatos();
      alert('Profesor asignado correctamente');
    } catch (error) {
      console.error('Error asignando profesor:', error);
      alert('Error al asignar profesor');
    }
  };

  const cancelarAsignacion = () => {
    setShowModalConfirmacion(false);
  };

  // CRUD Horarios
  const handleSubmitHorario = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formDataHorario.id_asignatura_profesor || !formDataHorario.dia_semana || !formDataHorario.hora_inicio || !formDataHorario.hora_fin) {
      setError('Todos los campos son obligatorios');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      await api.post('/horarios', formDataHorario);
      setFormDataHorario({ id_asignatura_profesor: '', dia_semana: '', hora_inicio: '', hora_fin: '', aula: '' });
      cargarDatos();
    } catch (error) {
      if (error.response?.status === 409 && error.response?.data?.conflicto) {
        setError(`⚠️ ${error.response.data.mensaje}`);
      } else {
        setError('Error al guardar horario');
      }
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleDeleteHorario = async (id) => {
    if (confirm('¿Eliminar este horario?')) {
      try {
        await api.delete(`/horarios/${id}`);
        cargarDatos();
      } catch (error) {
        setError('Error al eliminar horario');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  if (cargando) return <div className="card">Cargando...</div>;

  // Obtener horarios de una asignatura específica
  const getHorariosAsignatura = (idAsignatura) => {
    return horarios.filter(h => h.id_asignatura === idAsignatura);
  };

  return (
    <>
      {/* Formulario Nueva Asignatura */}
      <div className="card">
        <h3 className="card-title">{editandoAsignatura ? 'Editar Asignatura' : 'Nueva Asignatura'}</h3>
        <form onSubmit={handleSubmitAsignatura}>
          <div className="form-group">
            <input
              type="text"
              className="form-control"
              placeholder="Nombre de la asignatura"
              value={nombreAsignatura}
              onChange={(e) => setNombreAsignatura(e.target.value)}
              required
            />
          </div>
          <input type="hidden" value={idCarrera} />
          <button type="submit" className="btn btn-primary">
            {editandoAsignatura ? 'Actualizar' : 'Guardar'}
          </button>
          {editandoAsignatura && (
            <button type="button" className="btn btn-warning" style={{ marginLeft: '10px' }} onClick={() => {
              setNombreAsignatura('');
              setIdCarrera('');
              setEditandoAsignatura(null);
            }}>
              Cancelar
            </button>
          )}
        </form>
        {error && <div style={{ marginTop: '10px', color: 'red' }}>{error}</div>}
      </div>

      {/* Lista de Asignaturas con Horarios */}
      <div className="card">
        <h3 className="card-title">Asignaturas y Horarios</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Asignatura</th>
                <th>Carrera</th>
                <th>Profesor</th>
                <th>Horarios</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {asignaturas.map(asig => {
                const horariosAsig = getHorariosAsignatura(asig.id_asignatura);
                const estaExpandida = asignaturaExpandida === asig.id_asignatura;
                return (
                  <React.Fragment key={asig.id_asignatura}>
                    <tr>
                      <td>{asig.id_asignatura}</td>
                      <td>{asig.nombre_asignatura}</td>
                      <td>{asig.nombre_carrera}</td>
                      <td>
                        {asig.profesor_nombre ? `${asig.profesor_nombre} ${asig.profesor_apellido || ''}` : 'Sin asignar'}
                      </td>
                      <td>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => setAsignaturaExpandida(estaExpandida ? null : asig.id_asignatura)}
                        >
                          {estaExpandida ? '▲' : '▼'} {horariosAsig.length} horario(s)
                        </button>
                      </td>
                      <td>
                        <button className="btn btn-warning btn-sm" style={{ marginRight: '5px' }} onClick={() => handleEditAsignatura(asig)}>
                          ✏️
                        </button>
                        <button className="btn btn-info btn-sm" style={{ marginRight: '5px' }} onClick={() => handleAsignarProfesor(asig)}>
                          👨‍🏫
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteAsignatura(asig.id_asignatura)}>
                          🗑️
                        </button>
                      </td>
                    </tr>
                    {estaExpandida && (
                      <tr>
                        <td colSpan="6" style={{ background: '#f8f9fa', padding: '0' }}>
                          <div style={{ padding: '15px' }}>
                            <h4 style={{ marginBottom: '15px' }}>Horarios de {asig.nombre_asignatura}</h4>
                            {horariosAsig.length > 0 ? (
                              <table className="table" style={{ marginBottom: '15px' }}>
                                <thead>
                                  <tr>
                                    <th>Día</th>
                                    <th>Hora Inicio</th>
                                    <th>Hora Fin</th>
                                    <th>Aula</th>
                                    <th>Acción</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {horariosAsig.map(h => (
                                    <tr key={h.id_horario}>
                                      <td>{h.dia_semana}</td>
                                      <td>{h.hora_inicio}</td>
                                      <td>{h.hora_fin}</td>
                                      <td>{h.aula || '-'}</td>
                                      <td>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteHorario(h.id_horario)}>
                                          🗑️
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <p style={{ color: '#666', marginBottom: '15px' }}>No hay horarios registrados</p>
                            )}
                            {/* Formulario para agregar horario */}
                            <div style={{ borderTop: '1px solid #ddd', paddingTop: '15px' }}>
                              <h5 style={{ marginBottom: '10px' }}>Agregar Horario</h5>
                              <form onSubmit={(e) => {
                                e.preventDefault();
                                const asignaturaProf = asignaturasProfesores.find(ap => ap.id_asignatura === asig.id_asignatura);
                                if (!asignaturaProf) {
                                  alert('Primero debe asignar un profesor a la asignatura');
                                  return;
                                }
                                const form = e.target;
                                const nuevoHorario = {
                                  id_asignatura_profesor: asignaturaProf.id_asignatura_profesor,
                                  dia_semana: form.dia_semana.value,
                                  hora_inicio: form.hora_inicio.value,
                                  hora_fin: form.hora_fin.value,
                                  aula: form.aula.value
                                };
                                api.post('/horarios', nuevoHorario).then(() => {
                                  cargarDatos();
                                  form.reset();
                                }).catch((error) => {
                                  if (error.response?.status === 409 && error.response?.data?.conflicto) {
                                    alert(`⚠️ ${error.response.data.mensaje}`);
                                  } else {
                                    alert('Error al guardar horario');
                                  }
                                });
                              }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                                  <CustomSelect 
                                    name="dia_semana" 
                                    required 
                                    placeholder="Día"
                                    options={diasSemana.map(dia => ({ value: dia, label: dia }))}
                                  />
                                  <input type="time" name="hora_inicio" className="form-control" required />
                                  <input type="time" name="hora_fin" className="form-control" required />
                                  <input type="text" name="aula" className="form-control" placeholder="Aula" />
                                </div>
                                <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: '10px' }}>
                                  ➕ Agregar Horario
                                </button>
                              </form>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {asignaturas.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center' }}>No hay asignaturas</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para asignar profesor */}
      {showModalAsignarProfesor && !showModalConfirmacion && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Asignar Profesor</h3>
            <p><strong>Asignatura:</strong> {asignaturaSeleccionada?.nombre_asignatura}</p>
            
            <div className="form-group" style={{ position: 'relative' }}>
              <label>Buscar Profesor</label>
              <input
                type="text"
                className="form-control"
                placeholder="Escriba nombre, apellido o cédula (mín. 2 caracteres)"
                value={busquedaProfesor}
                onChange={(e) => {
                  setBusquedaProfesor(e.target.value);
                  buscarProfesores(e.target.value);
                }}
                autoComplete="off"
              />
              {buscandoProfesor && (
                <div style={{ position: 'absolute', right: '10px', top: '38px', color: '#666' }}>
                  Buscando...
                </div>
              )}
              
              {/* Resultados de búsqueda */}
              {mostrarResultados && resultadosBusqueda.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  {resultadosBusqueda.map(prof => (
                    <div
                      key={prof.id_profesor}
                      style={{
                        padding: '10px 15px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #eee',
                        hover: { background: '#f5f5f5' }
                      }}
                      onClick={() => seleccionarProfesor(prof)}
                      onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
                      onMouseLeave={(e) => e.target.style.background = 'white'}
                    >
                      <strong>{prof.nombre} {prof.apellido}</strong>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Cédula: {prof.cedula || 'N/A'} | Correo: {prof.correo}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {mostrarResultados && resultadosBusqueda.length === 0 && busquedaProfesor.length >= 2 && !buscandoProfesor && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '10px',
                  zIndex: 1000,
                  color: '#666'
                }}>
                  No se encontraron profesores
                </div>
              )}
            </div>
            
            {profesorSeleccionadoData && (
              <div style={{
                background: '#e8f5e9',
                padding: '10px 15px',
                borderRadius: '8px',
                marginBottom: '15px'
              }}>
                <strong>Profesor seleccionado:</strong><br/>
                {profesorSeleccionadoData.nombre} {profesorSeleccionadoData.apellido} 
                <span style={{ color: '#666', fontSize: '14px' }}>
                  (Cédula: {profesorSeleccionadoData.cedula || 'N/A'})
                </span>
              </div>
            )}
            
            <div className="form-group">
              <label>Fecha de Inicio</label>
              <input 
                type="date" 
                className="form-control"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            
            <div className="modal-buttons">
              <button className="btn btn-primary" onClick={handleGuardarAsignacion}>
                Guardar
              </button>
              <button className="btn btn-secondary" onClick={() => setShowModalAsignarProfesor(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación */}
      {showModalConfirmacion && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 15px',
                fontSize: '28px'
              }}>
                ❓
              </div>
              <h3 style={{ margin: 0, color: '#333' }}>¿Estás seguro?</h3>
            </div>
            
            <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px' }}>
              Vas a asignar el profesor <strong>{profesorSeleccionadoData?.nombre} {profesorSeleccionadoData?.apellido}</strong> a la asignatura <strong>{asignaturaSeleccionada?.nombre_asignatura}</strong>.
            </p>
            
            <div style={{
              background: '#f5f5f5',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                <strong>Detalles:</strong>
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>
                <div>📚 Asignatura: {asignaturaSeleccionada?.nombre_asignatura}</div>
                <div>👨‍🏫 Profesor: {profesorSeleccionadoData?.nombre} {profesorSeleccionadoData?.apellido}</div>
                <div>📅 Fecha inicio: {fechaInicio}</div>
                <div>🏫 Carrera: {profesorSeleccionadoData?.nombre_carrera || user?.nombre_carrera}</div>
              </div>
            </div>
            
            <div className="modal-buttons" style={{ justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={cancelarAsignacion}>
                No, cancelar
              </button>
              <button className="btn btn-primary" onClick={confirmarAsignacion} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                Sí, asignar profesor
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

export default GestionAsignaturasHorarios;
