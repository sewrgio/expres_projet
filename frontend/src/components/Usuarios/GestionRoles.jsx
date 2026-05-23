import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { IconUsers, IconSave, IconCancel, IconEdit } from '../Icons/SystemIcons';

const GestionRoles = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoTabla, setCargandoTabla] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [editando, setEditando] = useState(null);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  
  // Estado para los roles que se están editando
  const [rolesEdit, setRolesEdit] = useState({
    profesor: false,
    coordinador: false,
    'adjunto coordinacion': false,
    'tiempo completo': false,
    'medio tiempo': false
  });

  const cargarUsuarios = async (term = '') => {
    try {
      if (usuarios.length === 0) {
        setCargando(true);
      } else {
        setCargandoTabla(true);
      }
      const res = await api.get(`/usuarios?search=${encodeURIComponent(term)}`);
      setUsuarios(res.data);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      mostrarMensaje('❌ Error al cargar usuarios', 'error');
    } finally {
      setCargando(false);
      setCargandoTabla(false);
    }
  };

  useEffect(() => {
    cargarUsuarios('');
  }, []);

  // Buscador conectado a base de datos con retraso de rebote (debounce)
  useEffect(() => {
    if (cargando) return; // Evitar el primer render
    
    const delayDebounceFn = setTimeout(() => {
      cargarUsuarios(busqueda);
    }, 450);

    return () => clearTimeout(delayDebounceFn);
  }, [busqueda]);

  const mostrarMensaje = (texto, tipo) => {
    setMensaje({ texto, tipo });
    setTimeout(() => {
      setMensaje({ texto: '', tipo: '' });
    }, 4000);
  };

  const iniciarEdicion = (usuario) => {
    setUsuarioEditando(usuario);
    setEditando(usuario.id_usuario);
    const rolesArray = usuario.roles || [];
    setRolesEdit({
      profesor: rolesArray.includes('profesor'),
      coordinador: rolesArray.includes('coordinador'),
      'adjunto coordinacion': rolesArray.includes('adjunto coordinacion'),
      'tiempo completo': rolesArray.includes('tiempo completo'),
      'medio tiempo': rolesArray.includes('medio tiempo')
    });
  };

  const cancelarEdicion = () => {
    setEditando(null);
    setUsuarioEditando(null);
  };

  const guardarRoles = async (id_usuario) => {
    try {
      const rolesNuevos = [];
      if (rolesEdit.profesor) rolesNuevos.push('profesor');
      if (rolesEdit.coordinador) rolesNuevos.push('coordinador');
      if (rolesEdit['adjunto coordinacion']) rolesNuevos.push('adjunto coordinacion');
      if (rolesEdit['tiempo completo']) rolesNuevos.push('tiempo completo');
      if (rolesEdit['medio tiempo']) rolesNuevos.push('medio tiempo');

      // Si el usuario era auditor, asegurarnos de no quitárselo (esto normalmente no se toca por aquí, pero por precaución)
      const usuarioOriginal = usuarios.find(u => u.id_usuario === id_usuario);
      if (usuarioOriginal && usuarioOriginal.roles.includes('auditor')) {
        rolesNuevos.push('auditor');
      }

      await api.put(`/usuarios/${id_usuario}/roles`, { roles: rolesNuevos });
      mostrarMensaje('✅ Roles actualizados exitosamente', 'success');
      setEditando(null);
      setUsuarioEditando(null);
      cargarUsuarios(busqueda);
    } catch (error) {
      console.error('Error actualizando roles:', error);
      mostrarMensaje('❌ Error al actualizar roles', 'error');
    }
  };

  const toggleRol = (rol) => {
    const nuevosRoles = {
      ...rolesEdit,
      [rol]: !rolesEdit[rol]
    };

    // Si se selecciona coordinador, quitar adjunto
    if (rol === 'coordinador' && nuevosRoles.coordinador) {
      nuevosRoles['adjunto coordinacion'] = false;
    }
    
    // Si se selecciona adjunto, quitar coordinador
    if (rol === 'adjunto coordinacion' && nuevosRoles['adjunto coordinacion']) {
      nuevosRoles.coordinador = false;
    }

    // 1. Regla de dedicación automática (solo al activar/cambiar roles de sistema)
    if (rol === 'coordinador' && nuevosRoles.coordinador) {
      nuevosRoles['tiempo completo'] = true;
      nuevosRoles['medio tiempo'] = false;
    } else if (rol === 'adjunto coordinacion' && nuevosRoles['adjunto coordinacion']) {
      nuevosRoles['tiempo completo'] = true;
      nuevosRoles['medio tiempo'] = false;
    } else if (rol === 'profesor' && nuevosRoles.profesor && !nuevosRoles.coordinador && !nuevosRoles['adjunto coordinacion']) {
      nuevosRoles['tiempo completo'] = false;
      nuevosRoles['medio tiempo'] = true;
    }

    // 2. Permitir alternar manualmente el tipo de tiempo (dedicación)
    if (rol === 'tiempo completo') {
      nuevosRoles['tiempo completo'] = !rolesEdit['tiempo completo'];
      if (nuevosRoles['tiempo completo']) {
        nuevosRoles['medio tiempo'] = false;
      }
    }
    
    if (rol === 'medio tiempo') {
      nuevosRoles['medio tiempo'] = !rolesEdit['medio tiempo'];
      if (nuevosRoles['medio tiempo']) {
        nuevosRoles['tiempo completo'] = false;
      }
    }

    setRolesEdit(nuevosRoles);
  };

  if (cargando) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #003366',
          borderRadius: '50%',
          margin: '0 auto 20px',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ margin: 0, fontWeight: '600', color: '#003366' }}>Cargando usuarios y roles...</p>
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

      {/* Buscador Premium conectado a Base de Datos */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <span style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              fontSize: '18px',
              pointerEvents: 'none'
            }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Buscar usuarios por nombre, apellido, cédula o correo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="form-control"
              style={{
                paddingLeft: '48px',
                paddingRight: busqueda ? '40px' : '16px',
                margin: 0,
                width: '100%',
                borderRadius: '12px',
                border: '2px solid #e2e8f0',
                outline: 'none',
                height: '46px',
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '16px',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>
          
          <button
            onClick={() => cargarUsuarios(busqueda)}
            className="btn btn-primary"
            style={{
              height: '46px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#003366',
              color: 'white',
              borderRadius: '12px',
              padding: '0 24px',
              fontWeight: 'bold',
              border: 'none',
              cursor: 'pointer',
              minWidth: '120px'
            }}
          >
            Buscar
          </button>
        </div>
      </div>

      {cargandoTabla && (
        <div style={{
          padding: '10px 18px',
          backgroundColor: '#f0f9ff',
          color: '#0284c7',
          border: '1px solid #bae6fd',
          borderRadius: '12px',
          marginBottom: '20px',
          fontSize: '13px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'pulse 1.5s infinite'
        }}>
          <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
          Buscando en la base de datos en tiempo real...
        </div>
      )}

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

      {/* Vista de Dispositivos Móviles / Tablets (Tarjetas Premium sin scrollbar) */}
      <div className="block md:hidden space-y-4">
        {usuarios.map(u => (
          <div key={u.id_usuario} className="bg-white p-5 rounded-2xl shadow-md border border-gray-100/70 space-y-4 hover:shadow-lg transition-all duration-300">
            {/* Header: Name and Action */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white text-xs font-black shadow-md flex items-center justify-center flex-shrink-0">
                  {`${u.nombre?.[0] || ''}${u.apellido?.[0] || ''}`.toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-gray-950 text-sm leading-none break-all">
                    {u.nombre} {u.apellido}
                  </span>
                  <span className="text-[10px] text-gray-400 mt-1.5 font-medium leading-none">
                    C.I: {u.cedula}
                  </span>
                </div>
              </div>
              <button 
                className="btn btn-warning btn-sm"
                onClick={() => iniciarEdicion(u)}
                disabled={u.roles?.includes('auditor')}
                title={u.roles?.includes('auditor') ? "No se pueden editar roles del auditor" : "Editar roles"}
                style={{ 
                  opacity: u.roles?.includes('auditor') ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  borderRadius: '10px'
                }}
              >
                <IconEdit className="w-3.5 h-3.5" /> Editar
              </button>
            </div>

            {/* Email */}
            <div className="text-[11px] text-gray-500 font-medium bg-gray-50 px-2.5 py-1.5 rounded-lg w-fit break-all">
              {u.correo}
            </div>

            {/* Roles and Time allocation */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-50">
              <div className="space-y-1.5">
                <span className="text-[9px] font-extrabold uppercase text-gray-400 tracking-wider">Roles</span>
                <div className="flex flex-wrap gap-1.5">
                  {u.roles?.filter(rol => ['auditor', 'coordinador', 'adjunto coordinacion', 'profesor'].includes(rol)).length > 0 ? (
                    u.roles
                      .filter(rol => ['auditor', 'coordinador', 'adjunto coordinacion', 'profesor'].includes(rol))
                      .map(rol => (
                        <span key={rol} style={{
                          padding: '3px 8px',
                          borderRadius: '8px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          textTransform: 'capitalize',
                          backgroundColor: 
                            rol === 'auditor' ? '#f8d7da' : 
                            rol === 'coordinador' ? '#cce5ff' : 
                            rol === 'adjunto coordinacion' ? '#fff3cd' : 
                            '#d4edda',
                          color: 
                            rol === 'auditor' ? '#721c24' : 
                            rol === 'coordinador' ? '#004085' : 
                            rol === 'adjunto coordinacion' ? '#856404' : 
                            '#155724'
                        }}>
                          {rol}
                        </span>
                      ))
                  ) : (
                    <span className="text-gray-400 text-[11px] italic">Sin roles</span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[9px] font-extrabold uppercase text-gray-400 tracking-wider">Dedicación</span>
                <div className="flex flex-wrap gap-1.5">
                  {u.roles?.filter(rol => ['tiempo completo', 'medio tiempo'].includes(rol)).length > 0 ? (
                    u.roles
                      .filter(rol => ['tiempo completo', 'medio tiempo'].includes(rol))
                      .map(rol => (
                        <span key={rol} style={{
                          padding: '3px 8px',
                          borderRadius: '8px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          textTransform: 'capitalize',
                          backgroundColor: rol === 'tiempo completo' ? '#e0e7ff' : '#e0f2fe',
                          color: rol === 'tiempo completo' ? '#3730a3' : '#0369a1'
                        }}>
                          {rol}
                        </span>
                      ))
                  ) : (
                    <span className="text-gray-400 text-[11px] italic">No asignada</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {usuarios.length === 0 && (
          <div className="bg-white p-8 rounded-2xl text-center text-gray-400 border border-gray-100">
            <p className="font-semibold text-gray-500">No se encontraron usuarios</p>
          </div>
        )}
      </div>

      {/* Vista de Escritorio (Tabla Premium Rediseñada y Totalmente Fluida sin scrollbar) */}
      <div className="hidden md:block bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden w-full">
        <table className="w-full text-sm text-left border-collapse table-fixed bg-white" style={{ minWidth: '100%', tableLayout: 'fixed' }}>
          <thead className="bg-gray-50 text-gray-700 border-b border-gray-100 font-bold uppercase tracking-wider text-xs">
            <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
              <th className="w-[20%]" style={{ padding: '12px 10px', fontSize: '11px', letterSpacing: '0.05em' }}>Nombre</th>
              <th className="w-[24%]" style={{ padding: '12px 10px', fontSize: '11px', letterSpacing: '0.05em' }}>Correo / Cédula</th>
              <th className="w-[32%]" style={{ padding: '12px 10px', fontSize: '11px', letterSpacing: '0.05em' }}>Roles Actuales</th>
              <th className="w-[14%]" style={{ padding: '12px 10px', fontSize: '11px', letterSpacing: '0.05em' }}>Tipo de Tiempo</th>
              <th className="w-[10%] text-center" style={{ padding: '12px 10px', fontSize: '11px', letterSpacing: '0.05em', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {usuarios.map(u => (
              <tr key={u.id_usuario} style={{ borderBottom: '1px solid #eee' }} className="hover:bg-indigo-50/20 transition-colors">
                <td style={{ padding: '12px 10px', verticalAlign: 'middle' }}>
                  <strong className="text-gray-800 break-words block text-[13.5px] leading-tight">{u.nombre} {u.apellido}</strong>
                </td>
                <td style={{ padding: '12px 10px', fontSize: '12.5px', color: '#475569', verticalAlign: 'middle' }}>
                  <div className="break-all font-medium text-gray-700 leading-tight">{u.correo}</div>
                  <div className="text-[11px] text-slate-400 mt-1 font-semibold">C.I: {u.cedula}</div>
                </td>
                <td style={{ padding: '12px 10px', verticalAlign: 'middle' }}>
                  <div className="flex flex-wrap gap-1 w-full" style={{ whiteSpace: 'normal' }}>
                    {u.roles?.filter(rol => ['auditor', 'coordinador', 'adjunto coordinacion', 'profesor'].includes(rol)).length > 0 ? (
                      u.roles
                        .filter(rol => ['auditor', 'coordinador', 'adjunto coordinacion', 'profesor'].includes(rol))
                        .map(rol => (
                          <span key={rol} style={{
                            display: 'inline-block',
                            padding: '2.5px 7px',
                            borderRadius: '8px',
                            fontSize: '10.5px',
                            fontWeight: 'bold',
                            textTransform: 'capitalize',
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            backgroundColor: 
                              rol === 'auditor' ? '#fee2e2' : 
                              rol === 'coordinador' ? '#dbeafe' : 
                              rol === 'adjunto coordinacion' ? '#fef3c7' : 
                              '#dcfce7',
                            color: 
                              rol === 'auditor' ? '#991b1b' : 
                              rol === 'coordinador' ? '#1e40af' : 
                              rol === 'adjunto coordinacion' ? '#92400e' : 
                              '#166534'
                          }}>
                            {rol}
                          </span>
                        ))
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '12.5px', fontStyle: 'italic' }}>Sin roles</span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '12px 10px', verticalAlign: 'middle' }}>
                  <div className="flex flex-wrap gap-1 w-full" style={{ whiteSpace: 'normal' }}>
                    {u.roles?.filter(rol => ['tiempo completo', 'medio tiempo'].includes(rol)).length > 0 ? (
                      u.roles
                        .filter(rol => ['tiempo completo', 'medio tiempo'].includes(rol))
                        .map(rol => (
                          <span key={rol} style={{
                            display: 'inline-block',
                            padding: '2.5px 7px',
                            borderRadius: '8px',
                            fontSize: '10.5px',
                            fontWeight: 'bold',
                            textTransform: 'capitalize',
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            backgroundColor: rol === 'tiempo completo' ? '#e0e7ff' : '#e0f2fe',
                            color: rol === 'tiempo completo' ? '#3730a3' : '#0369a1'
                          }}>
                            {rol}
                          </span>
                        ))
                    ) : (
                      <span style={{ color: '#cbd5e1', fontSize: '12px', fontStyle: 'italic' }}>No asignado</span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                  <button 
                    className="btn btn-warning"
                    onClick={() => iniciarEdicion(u)}
                    disabled={u.roles?.includes('auditor')}
                    title={u.roles?.includes('auditor') ? "No se pueden editar roles del auditor" : "Editar roles"}
                    style={{ 
                      opacity: u.roles?.includes('auditor') ? 0.5 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      minWidth: '70px',
                      height: '32px'
                    }}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {usuarios.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontWeight: '600', fontSize: '14px' }}>
            No se encontraron usuarios que coincidan con la búsqueda.
          </div>
        )}
      </div>

      {/* Modal Premium de Edición de Roles */}
      {usuarioEditando && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={cancelarEdicion}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '28px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
              border: '1px solid #f1f5f9',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Modal */}
            <div style={{ padding: '28px 28px 20px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '16px',
                backgroundColor: '#e0e7ff',
                color: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '18px'
              }}>
                {`${usuarioEditando.nombre?.[0] || ''}${usuarioEditando.apellido?.[0] || ''}`.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>Editar Permisos</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b', fontWeight: 'medium' }}>
                  {usuarioEditando.nombre} {usuarioEditando.apellido} • C.I: {usuarioEditando.cedula}
                </p>
              </div>
              <button 
                onClick={cancelarEdicion}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>

            {/* Cuerpo del Modal */}
            <div style={{ padding: '28px', maxHeight: '60vh', overflowY: 'auto' }}>
              
              {/* Sección 1: Roles de Sistema */}
              <div style={{ marginBottom: '28px' }}>
                <h4 style={{
                  fontSize: '12px',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  color: '#64748b',
                  letterSpacing: '0.05em',
                  marginBottom: '16px',
                  marginTop: 0
                }}>
                  Roles de Sistema
                </h4>
                
                {/* Profesor Card */}
                <div 
                  onClick={() => toggleRol('profesor')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    borderRadius: '16px',
                    border: `2px solid ${rolesEdit.profesor ? '#4f46e5' : '#e2e8f0'}`,
                    backgroundColor: rolesEdit.profesor ? '#f5f3ff' : 'white',
                    cursor: 'pointer',
                    marginBottom: '10px',
                    transition: 'all 0.2s ease',
                    userSelect: 'none'
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: rolesEdit.profesor ? '#4f46e5' : '#334155' }}>Profesor</span>
                  <input 
                    type="checkbox" 
                    checked={rolesEdit.profesor}
                    onChange={() => {}} // Manejado por el card onClick
                    style={{ width: '18px', height: '18px', accentColor: '#4f46e5', cursor: 'pointer' }}
                  />
                </div>

                {/* Coordinador Card */}
                <div 
                  onClick={() => toggleRol('coordinador')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    borderRadius: '16px',
                    border: `2px solid ${rolesEdit.coordinador ? '#0284c7' : '#e2e8f0'}`,
                    backgroundColor: rolesEdit.coordinador ? '#f0f9ff' : 'white',
                    cursor: 'pointer',
                    marginBottom: '10px',
                    transition: 'all 0.2s ease',
                    userSelect: 'none'
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: rolesEdit.coordinador ? '#0369a1' : '#334155' }}>Coordinador</span>
                  <input 
                    type="checkbox" 
                    checked={rolesEdit.coordinador}
                    onChange={() => {}}
                    style={{ width: '18px', height: '18px', accentColor: '#0284c7', cursor: 'pointer' }}
                  />
                </div>

                {/* Adjunto Coordinacion Card */}
                <div 
                  onClick={() => toggleRol('adjunto coordinacion')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    borderRadius: '16px',
                    border: `2px solid ${rolesEdit['adjunto coordinacion'] ? '#d97706' : '#e2e8f0'}`,
                    backgroundColor: rolesEdit['adjunto coordinacion'] ? '#fffbeb' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    userSelect: 'none'
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: rolesEdit['adjunto coordinacion'] ? '#b45309' : '#334155' }}>Adjunto Coordinación</span>
                  <input 
                    type="checkbox" 
                    checked={rolesEdit['adjunto coordinacion']}
                    onChange={() => {}}
                    style={{ width: '18px', height: '18px', accentColor: '#d97706', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {/* Sección 2: Tipo de Tiempo */}
              <div>
                <h4 style={{
                  fontSize: '12px',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  color: '#64748b',
                  letterSpacing: '0.05em',
                  marginBottom: '4px',
                  marginTop: 0
                }}>
                  Tipo de Tiempo (Dedicación)
                </h4>
                <p style={{ margin: '0 0 16px 0', fontSize: '11.5px', color: '#64748b', fontStyle: 'italic' }}>
                  Asignado automáticamente por rol, pero puedes modificarlo libremente.
                </p>

                {/* Tiempo Completo Card */}
                <div 
                  onClick={() => toggleRol('tiempo completo')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    borderRadius: '16px',
                    border: `2px solid ${rolesEdit['tiempo completo'] ? '#6366f1' : '#e2e8f0'}`,
                    backgroundColor: rolesEdit['tiempo completo'] ? '#eef2ff' : 'white',
                    cursor: 'pointer',
                    marginBottom: '10px',
                    transition: 'all 0.2s ease',
                    userSelect: 'none'
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: rolesEdit['tiempo completo'] ? '#4f46e5' : '#334155' }}>Tiempo Completo</span>
                  <input 
                    type="checkbox" 
                    checked={rolesEdit['tiempo completo']}
                    onChange={() => {}}
                    style={{ width: '18px', height: '18px', accentColor: '#6366f1', cursor: 'pointer' }}
                  />
                </div>

                {/* Medio Tiempo Card */}
                <div 
                  onClick={() => toggleRol('medio tiempo')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    borderRadius: '16px',
                    border: `2px solid ${rolesEdit['medio tiempo'] ? '#06b6d4' : '#e2e8f0'}`,
                    backgroundColor: rolesEdit['medio tiempo'] ? '#ecfeff' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    userSelect: 'none'
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: rolesEdit['medio tiempo'] ? '#0891b2' : '#334155' }}>Medio Tiempo</span>
                  <input 
                    type="checkbox" 
                    checked={rolesEdit['medio tiempo']}
                    onChange={() => {}}
                    style={{ width: '18px', height: '18px', accentColor: '#06b6d4', cursor: 'pointer' }}
                  />
                </div>
              </div>

            </div>

            {/* Pie del Modal */}
            <div 
              style={{
                padding: '20px 28px',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                backgroundColor: '#f8fafc'
              }}
            >
              <button 
                onClick={cancelarEdicion}
                style={{
                  padding: '12px 20px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: 'white',
                  color: '#475569',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
              >
                Cancelar
              </button>
              <button 
                onClick={() => guardarRoles(usuarioEditando.id_usuario)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#003366',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 4px 6px -1px rgba(0, 51, 102, 0.2)'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#002244'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#003366'}
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

export default GestionRoles;
