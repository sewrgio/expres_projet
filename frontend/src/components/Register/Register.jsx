import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/Login.css';

const PREFIJOS_VENEZUELA = ['0412', '0414', '0424', '0416', '0426'];

const Register = () => {
  const navigate = useNavigate();
  const [carreras, setCarreras] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    cedula: '',
    carrera_id: '',
    correo: '',
    prefijo: '0412',
    numero_tlf: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const fetchCarreras = async () => {
      try {
        const res = await api.get('/carreras');
        setCarreras(res.data.filter(c => c.activo));
      } catch (err) {
        console.error('Error al cargar carreras:', err);
      }
    };
    fetchCarreras();
  }, []);

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleChange = (e) => {
    let value = e.target.value;
    const name = e.target.name;

    if (name === 'nombre' || name === 'apellido') {
      value = value.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ\s]/g, '');
    }
    
    if (name === 'cedula') {
      value = value.replace(/[^0-9]/g, '').substring(0, 10);
    }

    if (name === 'numero_tlf') {
      value = value.replace(/[^0-9]/g, '').substring(0, 7);
    }

    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.carrera_id) {
      setError('Debe seleccionar una carrera');
      return;
    }
    if (!validateEmail(formData.correo)) {
      setError('Correo electrónico inválido');
      return;
    }
    if (formData.numero_tlf.length < 7) {
      setError('El número de teléfono debe tener 7 dígitos');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/register', {
        nombre: formData.nombre,
        apellido: formData.apellido,
        cedula: formData.cedula,
        carrera_id: formData.carrera_id,
        correo: formData.correo,
        telefono: `${formData.prefijo}${formData.numero_tlf}`,
        password: formData.password
      });
      setSuccess(true);
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
          <div className="avatar-circle" style={{ fontSize: '40px', color: '#4CAF50' }}>✉️</div>
          <h2 style={{ color: '#333', marginTop: '20px' }}>¡Registro casi listo!</h2>
          <p style={{ color: '#666', marginTop: '10px' }}>Hemos enviado un correo de confirmación a <strong>{formData.correo}</strong>.</p>
          <p style={{ color: '#888', fontSize: '14px' }}>Por favor, verifica tu bandeja de entrada para activar tu cuenta.</p>
          <button onClick={() => navigate('/login')} className="login-button" style={{ marginTop: '20px' }}>
            VOLVER AL LOGIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-background">
      <div className="login-card register-card-wide">
        <div className="avatar-container">
          <div className="avatar-circle">📝</div>
        </div>
        <h2 className="login-title">Registro de Profesor</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group-grid-2">
            <div className="input-group">
              <input type="text" name="nombre" placeholder="Nombre" value={formData.nombre} onChange={handleChange} required />
            </div>
            <div className="input-group">
              <input type="text" name="apellido" placeholder="Apellido" value={formData.apellido} onChange={handleChange} required />
            </div>
          </div>

          <div className="input-group">
            <input type="text" name="cedula" placeholder="Cédula" value={formData.cedula} onChange={handleChange} required />
          </div>

          <div className="input-group select-group">
            <select 
              name="carrera_id" 
              value={formData.carrera_id} 
              onChange={handleChange} 
              required 
              className={formData.carrera_id ? 'select-active' : 'select-placeholder'}
            >
              <option value="" disabled>Seleccione su Carrera</option>
              {carreras.map((c) => (
                <option key={c.id_carrera} value={c.id_carrera}>{c.nombre_carrera}</option>
              ))}
            </select>
            <span className="select-arrow">⬇️</span>
          </div>

          <div className="input-group">
            <input type="email" name="correo" placeholder="Correo electrónico" value={formData.correo} onChange={handleChange} required />
          </div>

          <div className="phone-input-container">
            <div className="input-group select-prefix">
              <select name="prefijo" value={formData.prefijo} onChange={handleChange}>
                {PREFIJOS_VENEZUELA.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="input-group number-main">
              <input 
                type="tel" 
                name="numero_tlf" 
                placeholder="Número (7 dígitos)" 
                value={formData.numero_tlf} 
                onChange={handleChange} 
                required 
              />
            </div>
          </div>

          <div className="form-group-grid-2">
            <div className="input-group">
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" 
                placeholder="Contraseña" 
                value={formData.password} 
                onChange={handleChange} 
                required 
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                )}
              </button>
            </div>
            <div className="input-group">
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                name="confirmPassword" 
                placeholder="Confirmar" 
                value={formData.confirmPassword} 
                onChange={handleChange} 
                required 
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex="-1"
              >
                {showConfirmPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                )}
              </button>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'REGISTRANDO...' : 'CREAR CUENTA'}
          </button>
        </form>
        
        <div className="register-link">
           <span style={{color: '#888'}}>¿Ya tienes cuenta? </span>
           <Link to="/login" style={{color: '#3f51b5', fontWeight: 'bold'}}>Inicia sesión</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;