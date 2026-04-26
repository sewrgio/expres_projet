import React, { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';

const RecoveryCode = () => {
  const [code, setCode] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputs = useRef([]);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email');

  const handleChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 3) {
      inputs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length !== 4) {
      setError('Por favor ingresa los 4 dígitos');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/verify-recovery-code', {
        correo: email,
        codigo: fullCode
      });
      navigate(`/reset-password?email=${email}&code=${fullCode}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Código incorrecto');
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
        maxWidth: '400px',
        textAlign: 'center'
      }}>
        <h2 style={{ color: '#1e3c72', marginBottom: '10px' }}>Verificar Código</h2>
        <p style={{ color: '#666', marginBottom: '30px', fontSize: '14px' }}>
          Hemos enviado un código a <strong>{email}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '30px' }}>
            {code.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputs.current[idx] = el)}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                style={{
                  width: '60px',
                  height: '60px',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  borderRadius: '10px',
                  border: '2px solid #ddd',
                  outline: 'none',
                  transition: 'border-color 0.3s',
                  borderColor: digit ? '#3498db' : '#ddd'
                }}
              />
            ))}
          </div>

          {error && <p style={{ color: '#e74c3c', marginBottom: '20px' }}>{error}</p>}

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
            {loading ? 'Verificando...' : 'Verificar Código'}
          </button>
        </form>

        <button
          onClick={() => navigate('/forgot-password')}
          style={{
            background: 'none',
            border: 'none',
            color: '#3498db',
            marginTop: '20px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Reenviar código
        </button>
      </div>
    </div>
  );
};

export default RecoveryCode;
