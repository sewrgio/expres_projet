import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  IconUsers, IconEdit, IconGraduation, IconSave, IconCancel,
  IconEmail, IconPhone, IconIdCard, IconAlert, IconX, IconCheck, IconPower
} from '../Icons/SystemIcons';

const ControlCoordinadores = () => {
  const [coordinadores, setCoordinadores] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [mensajeVisible, setMensajeVisible] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    correo: '',
    telefono: '',
    id_carrera: ''
  });
  const [modalDesactivar, setModalDesactivar] = useState({
    mostrar: false,
    id_coordinador: null,
    nombre: ''
  });
  const [modalActivar, setModalActivar] = useState({
    mostrar: false,
    id_coordinador: null,
    nombre: ''
  });
  const [modalGuardar, setModalGuardar] = useState({
    mostrar: false,
    id_coordinador: null,
    id_usuario: null
  });

  // Helper para mostrar mensaje que se oculta automáticamente después de 5 segundos
  const mostrarMensaje = (texto, tipo) => {
    setMensaje({ texto, tipo });
    setMensajeVisible(true);
    setTimeout(() => {
      setMensajeVisible(false);
      setTimeout(() => {
        setMensaje({ texto: '', tipo: '' });
      }, 300); // Esperar a que termine la animación de salida
    }, 5000);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [coordsRes, carrerasRes] = await Promise.all([
        api.get('/coordinadores'),
        api.get('/carreras')
      ]);
      setCoordinadores(coordsRes.data);
      setCarreras(carrerasRes.data);
    } catch (error) {
      console.error('Error cargando datos:', error);
      mostrarMensaje('❌ Error al cargar datos', 'error');
    } finally {
      setCargando(false);
    }
  };

  const handleEditar = (coord) => {
    setEditando(coord.id_coordinador);
    setFormData({
      nombre: coord.nombre || '',
      apellido: coord.apellido || '',
      correo: coord.correo || '',
      telefono: coord.telefono || '',
      id_carrera: coord.id_carrera || ''
    });
  };

  const handleCancelar = () => {
    setEditando(null);
    setFormData({
      nombre: '',
      apellido: '',
      correo: '',
      telefono: '',
      id_carrera: ''
    });
  };

  const mostrarModalGuardar = (id_coordinador, id_usuario) => {
    setModalGuardar({
      mostrar: true,
      id_coordinador,
      id_usuario
    });
  };

  const cerrarModalGuardar = () => {
    setModalGuardar({
      mostrar: false,
      id_coordinador: null,
      id_usuario: null
    });
  };

  const handleConfirmarGuardar = async () => {
    try {
      const { id_coordinador, id_usuario } = modalGuardar;
      
      // Actualizar carrera del coordinador
      await api.put(`/coordinadores/${id_coordinador}`, {
        id_carrera: formData.id_carrera
      });

      // Actualizar datos del usuario
      await api.put(`/usuarios/${id_usuario}`, {
        nombre: formData.nombre,
        apellido: formData.apellido,
        correo: formData.correo,
        telefono: formData.telefono
      });

      mostrarMensaje('✅ Coordinador actualizado exitosamente', 'success');
      cerrarModalGuardar();
      setEditando(null);
      cargarDatos();
    } catch (error) {
      console.error('Error actualizando:', error);
      mostrarMensaje('❌ Error al actualizar coordinador', 'error');
      cerrarModalGuardar();
    }
  };

  const mostrarModalDesactivar = (coord) => {
    setModalDesactivar({
      mostrar: true,
      id_coordinador: coord.id_coordinador,
      nombre: `${coord.nombre} ${coord.apellido}`
    });
  };

  const cerrarModalDesactivar = () => {
    setModalDesactivar({
      mostrar: false,
      id_coordinador: null,
      nombre: ''
    });
  };

  const handleDesactivar = async () => {
    try {
      await api.put(`/coordinadores/${modalDesactivar.id_coordinador}/desactivar`);
      mostrarMensaje('✅ Coordinador desactivado exitosamente', 'success');
      cerrarModalDesactivar();
      cargarDatos();
    } catch (error) {
      console.error('Error desactivando:', error);
      mostrarMensaje('❌ Error al desactivar coordinador', 'error');
      cerrarModalDesactivar();
    }
  };

  const mostrarModalActivar = (coord) => {
    setModalActivar({
      mostrar: true,
      id_coordinador: coord.id_coordinador,
      nombre: `${coord.nombre} ${coord.apellido}`
    });
  };

  const cerrarModalActivar = () => {
    setModalActivar({
      mostrar: false,
      id_coordinador: null,
      nombre: ''
    });
  };

  const handleActivar = async () => {
    try {
      await api.put(`/coordinadores/${modalActivar.id_coordinador}/activar`);
      mostrarMensaje('✅ Coordinador activado exitosamente', 'success');
      cerrarModalActivar();
      cargarDatos();
    } catch (error) {
      console.error('Error activando:', error);
      mostrarMensaje('❌ Error al activar coordinador', 'error');
      cerrarModalActivar();
    }
  };

  if (cargando) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
        <p>Cargando coordinadores...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            backgroundColor: '#003366', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px'
          }}>
            <IconUsers />
          </div>
          <div>
            <h2 style={{ margin: 0, color: '#003366' }}>Control de Coordinadores</h2>
            <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
              Total: {coordinadores.length} coordinadores | 
              <span style={{ color: '#28a745' }}> {coordinadores.filter(c => c.usuario_activo).length} activos</span> | 
              <span style={{ color: '#dc3545' }}> {coordinadores.filter(c => !c.usuario_activo).length} inactivos</span>
            </p>
          </div>
        </div>
      </div>

      {/* Mensaje con animación */}
      {mensaje.texto && (
        <div style={{
          marginBottom: '20px',
          padding: '15px 20px',
          borderRadius: '8px',
          backgroundColor: mensaje.tipo === 'success' ? '#d4edda' : '#f8d7da',
          color: mensaje.tipo === 'success' ? '#155724' : '#721c24',
          border: `1px solid ${mensaje.tipo === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          opacity: mensajeVisible ? 1 : 0,
          transform: mensajeVisible ? 'translateY(0)' : 'translateY(-20px)',
          transition: 'all 0.3s ease-in-out',
          pointerEvents: mensajeVisible ? 'auto' : 'none'
        }}>
          {mensaje.texto}
        </div>
      )}

      {/* Grid de coordinadores */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
        gap: '20px' 
      }}>
        {coordinadores.map((coord) => (
          <div key={coord.id_coordinador} className="card" style={{ 
            padding: '20px',
            opacity: coord.usuario_activo ? 1 : 0.7,
            borderLeft: coord.usuario_activo ? 'none' : '4px solid #dc3545'
          }}>
            {editando === coord.id_coordinador ? (
              // Modo edición
              <div>
                <h4 style={{ margin: '0 0 15px 0', color: '#003366' }}>Editar Coordinador</h4>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#666' }}>
                    Nombre
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#666' }}>
                    Apellido
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.apellido}
                    onChange={(e) => setFormData({...formData, apellido: e.target.value})}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#666' }}>
                    Correo
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    value={formData.correo}
                    onChange={(e) => setFormData({...formData, correo: e.target.value})}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#666' }}>
                    Teléfono
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.telefono}
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#666' }}>
                    Carrera
                  </label>
                  <select
                    className="form-control"
                    value={formData.id_carrera}
                    onChange={(e) => setFormData({...formData, id_carrera: e.target.value})}
                    style={{ width: '100%' }}
                  >
                    {carreras.map(c => (
                      <option key={c.id_carrera} value={c.id_carrera}>
                        {c.nombre_carrera}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => mostrarModalGuardar(coord.id_coordinador, coord.id_usuario)}
                    style={{ flex: 1, padding: '10px' }}
                  >
                    <IconSave /> Guardar
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    onClick={handleCancelar}
                    style={{ flex: 1, padding: '10px' }}
                  >
                    <IconCancel /> Cancelar
                  </button>
                </div>
              </div>
            ) : (
              // Modo visualización
              <div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  marginBottom: '15px',
                  paddingBottom: '15px',
                  borderBottom: '1px solid #eee'
                }}>
                  <div style={{ 
                    width: '45px', 
                    height: '45px', 
                    backgroundColor: coord.usuario_activo ? '#003366' : '#6c757d', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}>
                    {coord.nombre?.charAt(0)}{coord.apellido?.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, color: '#003366' }}>
                      {coord.nombre} {coord.apellido}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#888' }}>
                        Coordinador
                      </span>
                      {coord.usuario_activo ? (
                        <span style={{ 
                          fontSize: '11px', 
                          color: '#28a745', 
                          backgroundColor: '#d4edda',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <span style={{ width: '6px', height: '6px', backgroundColor: '#28a745', borderRadius: '50%' }}></span>
                          En línea
                        </span>
                      ) : (
                        <span style={{ 
                          fontSize: '11px', 
                          color: '#dc3545', 
                          backgroundColor: '#f8d7da',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <span style={{ width: '6px', height: '6px', backgroundColor: '#dc3545', borderRadius: '50%' }}></span>
                          Inactivo
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <IconIdCard />
                    <span style={{ fontSize: '14px', color: '#333' }}>{coord.cedula}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <IconEmail />
                    <span style={{ fontSize: '14px', color: '#333' }}>{coord.correo}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <IconPhone />
                    <span style={{ fontSize: '14px', color: '#333' }}>
                      {coord.telefono || 'Sin teléfono'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IconGraduation />
                    <span style={{ fontSize: '14px', color: '#333', fontWeight: '500' }}>
                      {coord.nombre_carrera}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleEditar(coord)}
                    style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <IconEdit /> Editar
                  </button>
                  {coord.usuario_activo ? (
                    <button 
                      onClick={() => mostrarModalDesactivar(coord)}
                      style={{ 
                        flex: 1, 
                        padding: '10px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '6px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                    >
                      <IconPower /> Desactivar
                    </button>
                  ) : (
                    <button 
                      onClick={() => mostrarModalActivar(coord)}
                      style={{ 
                        flex: 1, 
                        padding: '10px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '6px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 4px rgba(40, 167, 69, 0.3)'
                      }}
                    >
                      <IconPower /> Activar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {coordinadores.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>👥</div>
          <h4 style={{ color: '#666', margin: '0 0 10px 0' }}>No hay coordinadores registrados</h4>
          <p style={{ color: '#888', margin: 0 }}>Ve a "Agregar Coordinador" para crear uno nuevo</p>
        </div>
      )}

      {/* Modal de confirmación para desactivar */}
      {modalDesactivar.mostrar && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                backgroundColor: '#fff3cd',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 15px'
              }}>
                <IconAlert style={{ color: '#856404', width: '30px', height: '30px' }} />
              </div>
              <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>
                ¿Desactivar coordinador?
              </h3>
              <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>
                Estás a punto de desactivar a <strong>{modalDesactivar.nombre}</strong>.
                El coordinador no podrá acceder al sistema, pero sus datos permanecerán guardados.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={cerrarModalDesactivar}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  color: '#333',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDesactivar}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para activar */}
      {modalActivar.mostrar && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                backgroundColor: '#d4edda',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 15px'
              }}>
                <IconCheck style={{ color: '#28a745', width: '30px', height: '30px' }} />
              </div>
              <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>
                ¿Activar coordinador?
              </h3>
              <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>
                Estás a punto de activar a <strong>{modalActivar.nombre}</strong>.
                El coordinador podrá volver a acceder al sistema.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={cerrarModalActivar}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  color: '#333',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleActivar}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Activar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para guardar cambios */}
      {modalGuardar.mostrar && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                backgroundColor: '#cce5ff',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 15px'
              }}>
                <IconSave style={{ color: '#004085', width: '30px', height: '30px' }} />
              </div>
              <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>
                ¿Guardar cambios?
              </h3>
              <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>
                ¿Estás seguro de que deseas guardar los cambios realizados en este coordinador?
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={cerrarModalGuardar}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  color: '#333',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarGuardar}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#003366',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                <IconSave /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlCoordinadores;
