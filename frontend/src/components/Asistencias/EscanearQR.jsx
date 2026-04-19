import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const EscanearQR = () => {
  const { user } = useAuth();
  const [qrData, setQrData] = useState(null); // { codigo, imagen }
  const [cargandoQR, setCargandoQR] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarMiQR();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarMiQR = async () => {
    if (!user?.id) return;

    setCargandoQR(true);
    setError('');

    try {
      const response = await api.get('/qr/mi-qr');
      setQrData({
        codigo: response.data.codigo,
        imagen: response.data.imagen, // imagen base64 generada por el backend
      });
    } catch (err) {
      console.error('Error cargando QR:', err);
      setError('No se pudo cargar el código QR. Intenta de nuevo.');
    } finally {
      setCargandoQR(false);
    }
  };

  return (
    <div>
      <h2 className="page-title">Mi Código QR</h2>

      <div className="card" style={{ textAlign: 'center' }}>
        <h3 className="card-title">Mi Código QR para Asistencia</h3>

        {cargandoQR ? (
          <div style={{ padding: '40px', color: '#666' }}>Cargando tu QR...</div>
        ) : error ? (
          <div style={{
            padding: '20px',
            color: 'red',
            background: '#fff0f0',
            borderRadius: '8px',
            margin: '20px auto',
            maxWidth: '400px'
          }}>
            ⚠️ {error}
            <div style={{ marginTop: '10px' }}>
              <button className="btn btn-secondary" onClick={cargarMiQR}>
                🔄 Reintentar
              </button>
            </div>
          </div>
        ) : qrData ? (
          <>
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '16px',
              display: 'inline-block',
              margin: '20px auto',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <img
                src={qrData.imagen}
                alt="Mi código QR"
                style={{ width: '250px', height: '250px', display: 'block' }}
              />
            </div>

            <div style={{
              marginTop: '20px',
              padding: '12px',
              backgroundColor: '#e8f4fd',
              borderRadius: '8px',
              fontSize: '14px',
              maxWidth: '400px',
              margin: '20px auto 0'
            }}>
              <strong>📌 Información:</strong>
              <ul style={{ textAlign: 'left', marginTop: '10px' }}>
                <li>Este QR es único para ti</li>
                <li>No compartas este QR con otras personas</li>
              </ul>
            </div>

            <button
              className="btn btn-secondary"
              onClick={cargarMiQR}
              style={{ marginTop: '20px' }}
            >
              🔄 Regenerar QR
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default EscanearQR;