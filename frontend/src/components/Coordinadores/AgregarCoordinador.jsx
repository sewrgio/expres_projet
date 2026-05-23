import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import CustomSelect from '../UI/CustomSelect';

const AgregarCoordinador = () => {
  const [carreras, setCarreras] = useState([]);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    cedula: '',
    correo: '',
    telefono: '',
    password: '',
    id_carrera: '',
    esCoordinador: false,
    esProfesor: false,
    esAdjuntoCoordinacion: false
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

  // Handlers para checkboxes con lógica de exclusión mutua
  const handleCoordinadorChange = (e) => {
    const isChecked = e.target.checked;
    setFormData({
      ...formData,
      esCoordinador: isChecked,
      // Si marco Coordinador y soy Profesor, desmarco Adjunto
      esAdjuntoCoordinacion: isChecked && formData.esProfesor ? false : formData.esAdjuntoCoordinacion
    });
  };

  const handleProfesorChange = (e) => {
    const isChecked = e.target.checked;
    setFormData({
      ...formData,
      esProfesor: isChecked
    });
  };

  const handleAdjuntoChange = (e) => {
    const isChecked = e.target.checked;
    setFormData({
      ...formData,
      esAdjuntoCoordinacion: isChecked,
      // Si marco Adjunto y soy Profesor, desmarco Coordinador
      esCoordinador: isChecked && formData.esProfesor ? false : formData.esCoordinador
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar que al menos un rol esté seleccionado
    if (!formData.esCoordinador && !formData.esProfesor && !formData.esAdjuntoCoordinacion) {
      setMensaje({ texto: '❌ Debe seleccionar al menos un rol (Coordinador, Profesor o Adjunto)', tipo: 'error' });
      return;
    }
    
    // Validar reglas de exclusión
    if (formData.esCoordinador && formData.esAdjuntoCoordinacion) {
      setMensaje({ texto: '❌ No puede ser Coordinador y Adjunto a la Coordinación al mismo tiempo', tipo: 'error' });
      return;
    }
    
    // Validar que si es coordinador, debe seleccionar una carrera
    if (formData.esCoordinador && !formData.id_carrera) {
      setMensaje({ texto: '❌ Debe seleccionar una carrera para el coordinador', tipo: 'error' });
      return;
    }
    
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
        id_carrera: formData.id_carrera,
        esCoordinador: formData.esCoordinador,
        esProfesor: formData.esProfesor,
        esAdjuntoCoordinacion: formData.esAdjuntoCoordinacion
      });
      setMensaje({ texto: '✅ Coordinador agregado exitosamente', tipo: 'success' });
      setFormData({
        nombre: '',
        apellido: '',
        cedula: '',
        correo: '',
        telefono: '',
        password: '',
        id_carrera: '',
        esCoordinador: false,
        esProfesor: false,
        esAdjuntoCoordinacion: false
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
          <label className="form-label">Tipo de Rol</label>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px', 
            padding: '15px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#f9f9f9'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: formData.esAdjuntoCoordinacion ? 'not-allowed' : 'pointer',
              opacity: formData.esAdjuntoCoordinacion ? 0.5 : 1
            }}>
              <input 
                type="checkbox"
                checked={formData.esCoordinador}
                onChange={handleCoordinadorChange}
                disabled={formData.esAdjuntoCoordinacion}
                style={{ width: '18px', height: '18px', cursor: formData.esAdjuntoCoordinacion ? 'not-allowed' : 'pointer' }}
              />
              <span style={{ fontSize: '14px', color: '#333' }}>Coordinador</span>
              {formData.esAdjuntoCoordinacion && (
                <span style={{ fontSize: '11px', color: '#dc3545', marginLeft: '5px' }}>(No disponible si es Adjunto)</span>
              )}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={formData.esProfesor}
                onChange={handleProfesorChange}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', color: '#333' }}>Profesor</span>
            </label>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: formData.esCoordinador ? 'not-allowed' : 'pointer',
              opacity: formData.esCoordinador ? 0.5 : 1
            }}>
              <input
                type="checkbox"
                checked={formData.esAdjuntoCoordinacion}
                onChange={handleAdjuntoChange}
                disabled={formData.esCoordinador}
                style={{ width: '18px', height: '18px', cursor: formData.esCoordinador ? 'not-allowed' : 'pointer' }}
              />
              <span style={{ fontSize: '14px', color: '#333' }}>Adjunto a la Coordinación</span>
              {formData.esCoordinador && (
                <span style={{ fontSize: '11px', color: '#dc3545', marginLeft: '5px' }}>(No disponible si es Coordinador)</span>
              )}
            </label>
          </div>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '8px', fontStyle: 'italic' }}>
            * Nota: No puede ser Coordinador y Adjunto simultáneamente.
          </p>
        </div>
        <div className="form-group">
          <label className="form-label">Carrera {(formData.esCoordinador || formData.esAdjuntoCoordinacion) && <span style={{color: '#dc3545'}}>*</span>}</label>
          <CustomSelect 
            name="id_carrera" 
            value={formData.id_carrera} 
            onChange={(val) => setFormData({...formData, id_carrera: val})} 
            required={formData.esCoordinador || formData.esAdjuntoCoordinacion}
            disabled={!(formData.esCoordinador || formData.esAdjuntoCoordinacion)}
            placeholder={(formData.esCoordinador || formData.esAdjuntoCoordinacion) ? 'Seleccionar carrera' : 'Solo aplica para Coordinador o Adjunto'}
            direction="up"
            options={carreras.map(c => ({
              value: c.id_carrera,
              label: c.nombre_carrera
            }))}
          />
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