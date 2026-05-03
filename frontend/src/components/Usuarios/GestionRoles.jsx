import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { IconUsers, IconSave, IconCancel, IconEdit } from '../Icons/SystemIcons';

const GestionRoles = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [editando, setEditando] = useState(null);
  
  // Estado para los roles que se están editando
  const [rolesEdit, setRolesEdit] = useState({
    profesor: false,
    coordinador: false,
    'adjunto coordinacion': false
  });

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      setCargando(true);
      const res = await api.get('/usuarios');
      setUsuarios(res.data);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      mostrarMensaje('❌ Error al cargar usuarios', 'error');
    } finally {
      setCargando(false);
    }
  };

  const mostrarMensaje = (texto, tipo) => {
    setMensaje({ texto, tipo });
    setTimeout(() => {
      setMensaje({ texto: '', tipo: '' });
    }, 4000);
  };

  const iniciarEdicion = (usuario) => {
    setEditando(usuario.id_usuario);
    const rolesArray = usuario.roles || [];
    setRolesEdit({
      profesor: rolesArray.includes('profesor'),
      coordinador: rolesArray.includes('coordinador'),
      'adjunto coordinacion': rolesArray.includes('adjunto coordinacion')
    });
  };

  const cancelarEdicion = () => {
    setEditando(null);
  };

  const guardarRoles = async (id_usuario) => {
    try {
      const rolesNuevos = [];
      if (rolesEdit.profesor) rolesNuevos.push('profesor');
      if (rolesEdit.coordinador) rolesNuevos.push('coordinador');
      if (rolesEdit['adjunto coordinacion']) rolesNuevos.push('adjunto coordinacion');

      // Si el usuario era auditor, asegurarnos de no quitárselo (esto normalmente no se toca por aquí, pero por precaución)
      const usuarioOriginal = usuarios.find(u => u.id_usuario === id_usuario);
      if (usuarioOriginal && usuarioOriginal.roles.includes('auditor')) {
        rolesNuevos.push('auditor');
      }

      await api.put(`/usuarios/${id_usuario}/roles`, { roles: rolesNuevos });
      mostrarMensaje('✅ Roles actualizados exitosamente', 'success');
      setEditando(null);
      cargarUsuarios();
    } catch (error) {
      console.error('Error actualizando roles:', error);
      mostrarMensaje('❌ Error al actualizar roles', 'error');
    }
  };

  const toggleRol = (rol) => {
    setRolesEdit({
      ...rolesEdit,
      [rol]: !rolesEdit[rol]
    });
  };

  if (cargando) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
        <p>Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div>
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
            <h2 style={{ margin: 0, color: '#003366' }}>Gestión de Roles de Usuarios</h2>
            <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
              Cambia o asigna roles a los usuarios registrados en el sistema.
            </p>
          </div>
        </div>
      </div>

      {mensaje.texto && (
        <div style={{
          marginBottom: '20px',
          padding: '15px 20px',
          borderRadius: '8px',
          backgroundColor: mensaje.tipo === 'success' ? '#d4edda' : '#f8d7da',
          color: mensaje.tipo === 'success' ? '#155724' : '#721c24',
          border: `1px solid ${mensaje.tipo === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
        }}>
          {mensaje.texto}
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>Nombre</th>
                <th style={{ padding: '12px' }}>Correo / Cédula</th>
                <th style={{ padding: '12px' }}>Roles Actuales</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id_usuario} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>
                    <strong>{u.nombre} {u.apellido}</strong>
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#555' }}>
                    {u.correo} <br />
                    <small>C.I: {u.cedula}</small>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {editando === u.id_usuario ? (
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={rolesEdit.profesor}
                            onChange={() => toggleRol('profesor')}
                          /> Profesor
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={rolesEdit.coordinador}
                            onChange={() => toggleRol('coordinador')}
                          /> Coordinador
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={rolesEdit['adjunto coordinacion']}
                            onChange={() => toggleRol('adjunto coordinacion')}
                          /> Adjunto Coord.
                        </label>
                        {u.roles?.includes('auditor') && (
                          <span style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                            (Auditor - No modificable)
                          </span>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {u.roles?.length > 0 ? u.roles.map(rol => (
                          <span key={rol} style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            textTransform: 'capitalize',
                            backgroundColor: rol === 'auditor' ? '#f8d7da' : rol === 'coordinador' ? '#cce5ff' : rol === 'adjunto coordinacion' ? '#fff3cd' : '#d4edda',
                            color: rol === 'auditor' ? '#721c24' : rol === 'coordinador' ? '#004085' : rol === 'adjunto coordinacion' ? '#856404' : '#155724'
                          }}>
                            {rol}
                          </span>
                        )) : (
                          <span style={{ color: '#999', fontSize: '13px' }}>Sin roles</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {editando === u.id_usuario ? (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => guardarRoles(u.id_usuario)}
                          title="Guardar"
                        >
                          <IconSave />
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={cancelarEdicion}
                          title="Cancelar"
                        >
                          <IconCancel />
                        </button>
                      </div>
                    ) : (
                      <button 
                        className="btn btn-warning btn-sm"
                        onClick={() => iniciarEdicion(u)}
                        disabled={u.roles?.includes('auditor')}
                        title={u.roles?.includes('auditor') ? "No se pueden editar roles del auditor" : "Editar roles"}
                        style={{ opacity: u.roles?.includes('auditor') ? 0.5 : 1 }}
                      >
                        <IconEdit />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {usuarios.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              No se encontraron usuarios
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GestionRoles;
