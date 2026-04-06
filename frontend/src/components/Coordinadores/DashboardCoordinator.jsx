import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const GestionCoordinadores = () => {
  const [coordinadores, setCoordinadores] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [usuariosDisponibles, setUsuariosDisponibles] = useState([]);
  const [carrerasDisponibles, setCarrerasDisponibles] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({ tipo: 'nuevo', nombre: '', apellido: '', cedula: '', correo: '', telefono: '', password: '', id_usuario: '', id_carrera: '' });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const [coordRes, carrRes, usuariosRes, carrDisponiblesRes] = await Promise.all([
        api.get('/coordinadores'), api.get('/carreras'), api.get('/coordinadores/disponibles/usuarios'), api.get('/coordinadores/disponibles/carreras')
      ]);
      setCoordinadores(coordRes.data);
      setCarreras(carrRes.data);
      setUsuariosDisponibles(usuariosRes.data);
      setCarrerasDisponibles(carrDisponiblesRes.data);
    } catch (error) { console.error(error); } finally { setCargando(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      let data = formData.tipo === 'nuevo' ? { nombre: formData.nombre, apellido: formData.apellido, cedula: formData.cedula, correo: formData.correo, telefono: formData.telefono, password: formData.password, id_carrera: formData.id_carrera } : { usuarioExistenteId: formData.id_usuario, id_carrera: formData.id_carrera };
      if (editando) await api.put(`/coordinadores/${editando}`, { id_carrera: formData.id_carrera });
      else await api.post('/coordinadores', data);
      resetForm(); cargarDatos();
    } catch (error) { setError(error.response?.data?.error || 'Error al guardar'); setTimeout(() => setError(''), 3000); }
  };

  const resetForm = () => { setFormData({ tipo: 'nuevo', nombre: '', apellido: '', cedula: '', correo: '', telefono: '', password: '', id_usuario: '', id_carrera: '' }); setMostrarForm(false); setEditando(null); };
  const handleEdit = (coordinador) => { setFormData({ tipo: 'existente', id_carrera: coordinador.id_carrera, id_usuario: '', nombre: '', apellido: '', cedula: '', correo: '', telefono: '', password: '' }); setEditando(coordinador.id_coordinador); setMostrarForm(true); };
  const handleDelete = async (id) => { if (confirm('¿Eliminar este coordinador?')) { try { await api.delete(`/coordinadores/${id}`); cargarDatos(); } catch (error) { setError('Error al eliminar'); setTimeout(() => setError(''), 3000); } } };

  if (cargando) return <div className="card">Cargando...</div>;

  return (
    <>
      <div className="card">
        <h3 className="card-title">Coordinadores</h3>
        {!mostrarForm ? <button className="btn btn-primary" onClick={() => setMostrarForm(true)}>+ Nuevo Coordinador</button> : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Tipo de registro</label>
              <select className="form-control" value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value })} disabled={editando}>
                <option value="nuevo">Crear nuevo usuario</option><option value="existente">Usar usuario existente</option>
              </select>
            </div>
            {formData.tipo === 'nuevo' ? (
              <>
                <div className="row"><div className="form-group"><input type="text" className="form-control" placeholder="Nombre" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} required /></div>
                <div className="form-group"><input type="text" className="form-control" placeholder="Apellido" value={formData.apellido} onChange={(e) => setFormData({ ...formData, apellido: e.target.value })} required /></div></div>
                <div className="form-group"><input type="text" className="form-control" placeholder="Cédula" value={formData.cedula} onChange={(e) => setFormData({ ...formData, cedula: e.target.value })} required /></div>
                <div className="form-group"><input type="email" className="form-control" placeholder="Correo electrónico" value={formData.correo} onChange={(e) => setFormData({ ...formData, correo: e.target.value })} required /></div>
                <div className="form-group"><input type="text" className="form-control" placeholder="Teléfono" value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} /></div>
                <div className="form-group"><input type="password" className="form-control" placeholder="Contraseña" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required /></div>
              </>
            ) : (
              <div className="form-group">
                <select className="form-control" value={formData.id_usuario} onChange={(e) => setFormData({ ...formData, id_usuario: e.target.value })} required>
                  <option value="">Seleccionar usuario</option>{usuariosDisponibles.map(u => (<option key={u.id_usuario} value={u.id_usuario}>{u.nombre} {u.apellido} - {u.correo} ({u.cedula})</option>))}
                </select>
              </div>
            )}
            <div className="form-group">
              <select className="form-control" value={formData.id_carrera} onChange={(e) => setFormData({ ...formData, id_carrera: e.target.value })} required>
                <option value="">Seleccionar carrera</option>{(editando ? carreras : carrerasDisponibles).map(c => (<option key={c.id_carrera} value={c.id_carrera}>{c.nombre_carrera}</option>))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary">{editando ? 'Actualizar' : 'Guardar'}</button>
            <button type="button" className="btn btn-warning" style={{ marginLeft: '10px' }} onClick={resetForm}>Cancelar</button>
          </form>
        )}
        {error && <div style={{ marginTop: '10px', color: 'red' }}>{error}</div>}
      </div>

      <div className="card">
        <h3 className="card-title">Lista de Coordinadores</h3>
        <div className="table-container">
          <table className="table">
            <thead><tr><th>ID</th><th>Nombre</th><th>Cédula</th><th>Correo</th><th>Teléfono</th><th>Carrera</th><th>Acciones</th></tr></thead>
            <tbody>
              {coordinadores.map(coord => (
                <tr key={coord.id_coordinador}>
                  <td>{coord.id_coordinador}</td><td>{coord.nombre} {coord.apellido}</td><td>{coord.cedula}</td><td>{coord.correo}</td><td>{coord.telefono}</td><td>{coord.nombre_carrera}</td>
                  <td><button className="btn btn-warning" style={{ marginRight: '5px' }} onClick={() => handleEdit(coord)}>✏️</button><button className="btn btn-danger" onClick={() => handleDelete(coord.id_coordinador)}>🗑️</button></td>
                </tr>
              ))}
              {coordinadores.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center' }}>No hay coordinadores registrados</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default GestionCoordinadores;