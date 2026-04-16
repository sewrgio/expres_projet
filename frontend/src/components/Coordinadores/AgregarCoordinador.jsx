import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const AgregarCoordinador = () => {
  const [carreras, setCarreras] = useState([]);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    cedula: '',
    correo: '',
    telefono: '',
    password: '',
    id_carrera: ''
  });
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  useEffect(() => {
    cargarCarreras();
  }, []);

  const cargarCarreras = async () => {
    try {
      const response = await api.get('/carreras');
      setCarreras(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setMensaje({ texto: '', tipo: '' });

    try {
      await api.post('/coordinadores', {
        nombre: formData.nombre,
        apellido: formData.apellido,
        cedula: formData.cedula,
        correo: formData.correo,
        telefono: formData.telefono,
        password: formData.password,
        id_carrera: formData.id_carrera
      });
      setMensaje({ texto: '✅ Coordinador agregado exitosamente', tipo: 'success' });
      setFormData({
        nombre: '',
        apellido: '',
        cedula: '',
        correo: '',
        telefono: '',
        password: '',
        id_carrera: ''
      });
    } catch (error) {
      setMensaje({ texto: '❌ Error al agregar coordinador', tipo: 'error' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="card">
      <h3 className="card-title">Agregar Coordinador</h3>
      <form onSubmit={handleSubmit}>
        <div className="row">
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Nombre" 
              value={formData.nombre} 
              onChange={(e) => setFormData({...formData, nombre: e.target.value})} 
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Apellido</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Apellido" 
              value={formData.apellido} 
              onChange={(e) => setFormData({...formData, apellido: e.target.value})} 
              required 
            />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Cédula</label>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Cédula" 
            value={formData.cedula} 
            onChange={(e) => setFormData({...formData, cedula: e.target.value})} 
            required 
          />
        </div>
        <div className="form-group">
          <label className="form-label">Correo electrónico</label>
          <input 
            type="email" 
            className="form-control" 
            placeholder="Correo electrónico" 
            value={formData.correo} 
            onChange={(e) => setFormData({...formData, correo: e.target.value})} 
            required 
          />
        </div>
        <div className="form-group">
          <label className="form-label">Teléfono</label>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Teléfono" 
            value={formData.telefono} 
            onChange={(e) => setFormData({...formData, telefono: e.target.value})} 
          />
        </div>
        <div className="form-group">
          <label className="form-label">Contraseña</label>
          <input 
            type="password" 
            className="form-control" 
            placeholder="Contraseña" 
            value={formData.password} 
            onChange={(e) => setFormData({...formData, password: e.target.value})} 
            required 
          />
        </div>
        <div className="form-group">
          <label className="form-label">Carrera</label>
          <select 
            className="form-control" 
            value={formData.id_carrera} 
            onChange={(e) => setFormData({...formData, id_carrera: e.target.value})} 
            required
          >
            <option value="">Seleccionar carrera</option>
            {carreras.map(c => (
              <option key={c.id_carrera} value={c.id_carrera}>{c.nombre_carrera}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary" disabled={cargando}>
          {cargando ? 'Guardando...' : 'Agregar Coordinador'}
        </button>
      </form>
      {mensaje.texto && (
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          borderRadius: '5px', 
          backgroundColor: mensaje.tipo === 'success' ? '#d4edda' : '#f8d7da', 
          color: mensaje.tipo === 'success' ? '#155724' : '#721c24' 
        }}>
          {mensaje.texto}
        </div>
      )}
    </div>
  );
};

export default AgregarCoordinador;