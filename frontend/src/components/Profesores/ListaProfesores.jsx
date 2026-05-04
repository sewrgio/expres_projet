import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import CustomSelect from '../UI/CustomSelect';

const ListaProfesores = () => {
  const { user } = useAuth();
  const [profesores, setProfesores] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [profesorSeleccionado, setProfesorSeleccionado] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    cedula: '',
    correo: '',
    telefono: '',
    id_carrera: ''
  });
  
  // Buscador de profesores
  const [busquedaProfesor, setBusquedaProfesor] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [buscandoProfesor, setBuscandoProfesor] = useState(false);
  const [mostrarResultados, setMostrarResultados] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [profesoresRes, carrerasRes] = await Promise.all([
        api.get('/profesores'),
        api.get('/carreras')
      ]);
      
      let profesoresFiltrados = profesoresRes.data;
      
      // Si es coordinador, filtrar por su carrera
      if (user?.roles?.includes('coordinador') && !user?.roles?.includes('auditor')) {
        profesoresFiltrados = profesoresRes.data.filter(p => p.id_carrera === user.id_carrera);
      }
      
      setProfesores(profesoresFiltrados);
      setCarreras(carrerasRes.data);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleEditar = (profesor) => {
    setProfesorSeleccionado(profesor);
    setFormData({
      nombre: profesor.nombre || '',
      apellido: profesor.apellido || '',
      cedula: profesor.cedula || '',
      correo: profesor.correo || '',
      telefono: profesor.telefono || '',
      id_carrera: profesor.id_carrera || ''
    });
    setShowModal(true);
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
    setBusquedaProfesor(`${profesor.nombre} ${profesor.apellido} - ${profesor.cedula || profesor.correo}`);
    setMostrarResultados(false);
    // Scroll al profesor en la tabla o abrir modal de edición
    setProfesorSeleccionado(profesor);
    setFormData({
      nombre: profesor.nombre || '',
      apellido: profesor.apellido || '',
      cedula: profesor.cedula || '',
      correo: profesor.correo || '',
      telefono: profesor.telefono || '',
      id_carrera: profesor.id_carrera || ''
    });
    setShowModal(true);
  };

  const handleGuardar = async () => {
    if (!formData.nombre || !formData.apellido || !formData.cedula) {
      alert('Por favor complete los campos obligatorios');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmarGuardar = async () => {
    try {
      await api.put(`/profesores/${profesorSeleccionado.id_profesor}`, formData);
      setShowModal(false);
      setShowConfirmModal(false);
      cargarDatos();
    } catch (error) {
      console.error('Error actualizando profesor:', error);
      alert('Error al actualizar el profesor');
    }
  };

  const handleCancelarGuardar = () => {
    setShowConfirmModal(false);
  };

  if (cargando) {
    return <div className="card" style={{ textAlign: 'center' }}>Cargando profesores...</div>;
  }

  return (
    <>
      <div className="card">
        <h3 className="card-title">Lista de Profesores</h3>
        
        {/* Buscador de profesores */}
        <div className="form-group" style={{ position: 'relative', marginBottom: '20px', maxWidth: '400px' }}>
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
                    borderBottom: '1px solid #eee'
                  }}
                  onClick={() => seleccionarProfesor(prof)}
                  onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
                  onMouseLeave={(e) => e.target.style.background = 'white'}
                >
                  <strong>{prof.nombre} {prof.apellido}</strong>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Cédula: {prof.cedula || 'N/A'} | Carrera: {prof.nombre_carrera || 'N/A'}
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
                      onClick={() => handleEditar(prof)}
                    >
                      ✏️ Editar
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

      {/* Modal para editar profesor */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-icon">👤</div>
              <div>
                <h3>Editar Profesor</h3>
                <p>ID: {profesorSeleccionado?.id_profesor}</p>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label>Nombre *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Apellido *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.apellido}
                  onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label>Cédula *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.cedula}
                  onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Teléfono</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Correo Electrónico</label>
              <input
                type="email"
                className="form-control"
                value={formData.correo}
                onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Carrera</label>
              <CustomSelect
                name="id_carrera"
                value={formData.id_carrera}
                onChange={(e) => setFormData({ ...formData, id_carrera: e.target.value })}
                placeholder="Seleccionar carrera"
                options={carreras.map(carr => ({
                  value: carr.id_carrera,
                  label: carr.nombre_carrera
                }))}
              />
            </div>

            <div className="modal-buttons">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleGuardar}>
                💾 Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para guardar */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={handleCancelarGuardar}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon">💾</div>
              <div>
                <h3>Guardar Cambios</h3>
                <p>¿Estás seguro de que quieres guardar los cambios?</p>
              </div>
            </div>
            <div className="modal-buttons">
              <button className="btn btn-secondary" onClick={handleCancelarGuardar}>
                No
              </button>
              <button className="btn btn-primary" onClick={handleConfirmarGuardar}>
                Sí
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ListaProfesores;