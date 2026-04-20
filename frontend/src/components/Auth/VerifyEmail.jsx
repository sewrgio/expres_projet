import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verificando');
  const navigate = useNavigate();
  const token = searchParams.get('token');

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error');
        return;
      }
      try {
        await api.get(`/auth/verify-email?token=${token}`);
        setStatus('success');
        setTimeout(() => navigate('/login'), 3000);
      } catch (error) {
        setStatus('error');
      }
    };
    verify();
  }, [token, navigate]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      color: 'white',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        padding: '40px',
        borderRadius: '20px',
        textAlign: 'center',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        maxWidth: '400px'
      }}>
        {status === 'verificando' && (
          <>
            <div className="spinner" style={{
              width: '50px',
              height: '50px',
              border: '5px solid rgba(255, 255, 255, 0.3)',
              borderTop: '5px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }}></div>
            <h2>Verificando tu correo...</h2>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ fontSize: '50px', color: '#4caf50', marginBottom: '20px' }}>✓</div>
            <h2>¡Correo verificado!</h2>
            <p>Tu cuenta ha sido activada con éxito. Redirigiendo al login...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: '50px', color: '#f44336', marginBottom: '20px' }}>✕</div>
            <h2>Error de verificación</h2>
            <p>El enlace es inválido o ha expirado.</p>
            <Link to="/login" style={{
              color: 'white',
              textDecoration: 'underline',
              marginTop: '20px',
              display: 'inline-block'
            }}>Volver al inicio</Link>
          </>
        )}
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default VerifyEmail;
