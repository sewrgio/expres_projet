import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    cedula: '',
    correo: '',
    telefono: '',
    password: '',
    confirmPassword: '',
    carrera_id: ''  // 👈 Nuevo campo
  });
  const [carreras, setCarreras] = useState([]);  // 👈 Lista de carreras
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // 👈 Cargar carreras al montar el componente
  useEffect(() => {
    const cargarCarreras = async () => {
      try {
        const response = await api.get('/carreras');
        setCarreras(response.data);
      } catch (error) {
        console.error('Error cargando carreras:', error);
      }
    };
    cargarCarreras();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres');
      return;
    }

    if (!formData.carrera_id) {
      setError('Debe seleccionar una carrera');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/register', {
        nombre: formData.nombre,
        apellido: formData.apellido,
        cedula: formData.cedula,
        correo: formData.correo,
        telefono: formData.telefono,
        password: formData.password,
        carrera_id: formData.carrera_id  // 👈 Enviar carrera
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
      <div className="login-container">
        <div className="login-card">
          <div className="login-logo">✅</div>
          <h2 className="login-title">¡Registro exitoso!</h2>
          <p>Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">📚</div>
        <h2 className="login-title">Registro de Usuario</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              name="nombre"
              className="form-control"
              placeholder="Nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="text"
              name="apellido"
              className="form-control"
              placeholder="Apellido"
              value={formData.apellido}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="text"
              name="cedula"
              className="form-control"
              placeholder="Cédula"
              value={formData.cedula}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="email"
              name="correo"
              className="form-control"
              placeholder="Correo electrónico"
              value={formData.correo}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="tel"
              name="telefono"
              className="form-control"
              placeholder="Teléfono"
              value={formData.telefono}
              onChange={handleChange}
            />
          </div>

          {/* 👈 Nuevo campo: Selección de carrera */}
          <div className="form-group">
            <select
              name="carrera_id"
              className="form-control"
              value={formData.carrera_id}
              onChange={handleChange}
              required
            >
              <option value="">Seleccionar Carrera</option>
              {carreras.map(carr => (
                <option key={carr.id_carrera} value={carr.id_carrera}>
                  {carr.nombre_carrera}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <input
              type="password"
              name="password"
              className="form-control"
              placeholder="Contraseña"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              name="confirmPassword"
              className="form-control"
              placeholder="Confirmar contraseña"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
          {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>
        <p style={{ marginTop: '20px' }}>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión aquí</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;