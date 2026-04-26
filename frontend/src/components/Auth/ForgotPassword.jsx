import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await api.post('/auth/forgot-password', { correo: email });
      setMessage('Código enviado con éxito. Revisa tu correo.');
      setTimeout(() => navigate(`/recovery-code?email=${email}`), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar el código');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '15px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h2 style={{ color: '#1e3c72', marginBottom: '20px', textAlign: 'center' }}>Recuperar Contraseña</h2>
        <p style={{ color: '#666', marginBottom: '25px', textAlign: 'center', fontSize: '14px' }}>
          Ingresa tu correo electrónico y te enviaremos un código de 4 dígitos para restablecer tu clave.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>Correo Electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@iujo.edu.ve"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: '#3498db',
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.3s'
            }}
          >
            {loading ? 'Enviando...' : 'Enviar Código'}
          </button>
        </form>

        {message && <p style={{ color: '#27ae60', marginTop: '15px', textAlign: 'center' }}>{message}</p>}
        {error && <p style={{ color: '#e74c3c', marginTop: '15px', textAlign: 'center' }}>{error}</p>}

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <Link to="/login" style={{ color: '#3498db', textDecoration: 'none', fontSize: '14px' }}>Volver al Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
