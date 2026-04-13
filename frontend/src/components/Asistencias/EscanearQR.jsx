import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const EscanearQR = () => {
  const { user } = useAuth();
  const [qrProfesor, setQrProfesor] = useState(null);
  const [cargandoQR, setCargandoQR] = useState(false);

  useEffect(() => {
    cargarMiQR();
  }, []);

  const cargarMiQR = async () => {
    if (!user?.id) return;
    
    setCargandoQR(true);
    try {
      // ✅ CORREGIDO: /qr/mi-qr (no /gr/mi-qr)
      const response = await api.get('/qr/mi-qr');
      const codigoQR = response.data.codigo || response.data.codigo_qr;
      setQrProfesor(codigoQR);
    } catch (error) {
      console.error('Error cargando QR:', error);
      setQrProfesor(`profesor_${user.id}_${Date.now()}`);
    }
    setCargandoQR(false);
  };

  return (
    <div>
      <h2 className="page-title">Mi Código QR</h2>

      <div className="card" style={{ textAlign: 'center' }}>
        <h3 className="card-title">Mi Código QR para Asistencia</h3>
        <p></p>
        {cargandoQR ? (
          <div>Cargando tu QR...</div>
        ) : (
          <div style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '16px',
            display: 'inline-block',
            margin: '20px auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                qrProfesor || `profesor_${user?.id}_${Date.now()}`
              )}`}
              alt="Mi código QR"
              style={{ width: '250px', height: '250px' }}
            />
          </div>
        )}
        
        <div style={{ 
          marginTop: '20px', 
          padding: '12px', 
          backgroundColor: '#e8f4fd', 
          borderRadius: '8px',
          fontSize: '14px'
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
      </div>
    </div>
  );
};

export default EscanearQR;