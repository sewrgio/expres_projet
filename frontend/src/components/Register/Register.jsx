import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/Login.css'; // Asegúrate de que el nombre del archivo CSS coincida

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    cedula: '',
    carrera: '',
    correo: '',
    telefono: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Opciones de carrera
  const carreras = [
    "Informática",
    "Educación",
    "Contaduría",
    "Administración",
    "Electrónica"
  ];

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleChange = (e) => {
    let value = e.target.value;
    const name = e.target.name;

    // Lógica de validación rápida mientras se escribe
    if (name === 'nombre' || name === 'apellido') {
      value = value.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ\s]/g, '');
    }
    
    if (name === 'cedula' || name === 'telefono') {
      value = value.replace(/[^0-9]/g, '');
    }

    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones finales
    if (!formData.carrera) {
      setError('Debe seleccionar una carrera');
      return;
    }
    if (!validateEmail(formData.correo)) {
      setError('Correo electrónico inválido');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (formData.password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/register', {
        nombre: formData.nombre,
        apellido: formData.apellido,
        cedula: formData.cedula,
        carrera: formData.carrera,
        correo: formData.correo,
        telefono: formData.telefono,
        password: formData.password
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="login-background">
        <div className="login-card">
          <div className="avatar-circle" style={{ color: '#4CAF50' }}>✅</div>
          <h2 style={{ color: '#333', marginTop: '20px' }}>¡Registro exitoso!</h2>
          <p style={{ color: '#888' }}>Redirigiendo al inicio de sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-background">
      <div className="login-card register-card-wide">
        {/* Icono de registro superior */}
        <div className="avatar-container">
          <div className="avatar-circle">
            📝
          </div>
        </div>
        <h2 className="login-title">Registro de Profesor</h2>
        
        <form onSubmit={handleSubmit}>
          {/* Grupo: Nombre y Apellido (2 Columnas) */}
          <div className="form-group-grid-2">
            <div className="input-group">
              <input type="text" name="nombre" placeholder="Nombre" value={formData.nombre} onChange={handleChange} required />
            </div>
            <div className="input-group">
              <input type="text" name="apellido" placeholder="Apellido" value={formData.apellido} onChange={handleChange} required />
            </div>
          </div>

          {/* Cédula (Ancho completo) */}
          <div className="input-group">
            <input type="text" name="cedula" placeholder="Cédula" value={formData.cedula} onChange={handleChange} required />
          </div>

          {/* Selector de Carrera (Ancho completo) */}
          <div className="input-group select-group">
            <select 
              name="carrera" 
              value={formData.carrera} 
              onChange={handleChange} 
              required 
              className={formData.carrera ? 'select-active' : 'select-placeholder'}
            >
              <option value="" disabled>Seleccione su Carrera</option>
              {carreras.map((c, index) => (
                <option key={index} value={c}>{c}</option>
              ))}
            </select>
            <span className="select-arrow">⬇️</span>
          </div>

          {/* Correo y Teléfono (Ancho completo) */}
          <div className="input-group">
            <input type="email" name="correo" placeholder="Correo electrónico" value={formData.correo} onChange={handleChange} required />
          </div>
          <div className="input-group">
            <input type="tel" name="telefono" placeholder="Teléfono" value={formData.telefono} onChange={handleChange} required />
          </div>

          {/* Grupo: Contraseña y Confirmar (2 Columnas) */}
          <div className="form-group-grid-2">
            <div className="input-group">
              <input type="password" name="password" placeholder="Contraseña" value={formData.password} onChange={handleChange} required />
            </div>
            <div className="input-group">
              <input type="password" name="confirmPassword" placeholder="Confirmar" value={formData.confirmPassword} onChange={handleChange} required />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          {/* Botón de acción */}
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'REGISTRANDO...' : 'CREAR CUENTA'}
          </button>
        </form>
        
        {/* Link inferior */}
        <div className="register-link">
           <span style={{color: '#888'}}>¿Ya tienes cuenta? </span>
           <Link to="/login" style={{color: '#3f51b5', fontWeight: 'bold'}}>Inicia sesión</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;