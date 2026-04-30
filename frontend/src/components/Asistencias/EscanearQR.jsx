import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const EscanearQR = () => {
  const { user } = useAuth();
  const [qrData, setQrData] = useState(null); // { codigo, imagen }
  const [cargandoQR, setCargandoQR] = useState(false);
  const [error, setError] = useState('');
  const [enArea, setEnArea] = useState(false);
  const [distancia, setDistancia] = useState(null);

  const IUJO_COORDS = { lat: 10.510717, lon: -66.936949 };

  const calcularDistancia = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const monitorearUbicacion = useCallback(() => {
    if (!navigator.geolocation) {
      console.error('Geolocalización no soportada');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const d = calcularDistancia(
          pos.coords.latitude,
          pos.coords.longitude,
          IUJO_COORDS.lat,
          IUJO_COORDS.lon
        );
        setDistancia(d);
        setEnArea(d <= 1.0); // 1km flexible
      },
      (err) => console.error('Error de geolocalización:', err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    cargarMiQR();
    const cleanGeolocation = monitorearUbicacion();
    return () => cleanGeolocation && cleanGeolocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monitorearUbicacion]);

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
        ) : (!user?.roles?.includes('profesor') && !user?.roles?.includes('coordinador')) ? (
          <div style={{ padding: '40px', color: '#666' }}>
            ℹ️ Tu cuenta no tiene registros de asistencia asignados.
          </div>
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
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              opacity: enArea ? 1 : 0.2,
              filter: enArea ? 'none' : 'grayscale(100%)',
              transition: 'all 0.3s ease'
            }}>
              <img
                src={qrData.imagen}
                alt="Mi código QR"
                style={{ width: '250px', height: '250px', display: 'block' }}
              />
            </div>

            {!enArea && (
              <div style={{
                marginTop: '20px',
                padding: '15px',
                background: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '8px',
                color: '#856404',
                maxWidth: '400px',
                margin: '20px auto'
              }}>
                ⚠️ No estás dentro del área del IUJO. El QR no se puede escanear.
              </div>
            )}

            <div style={{
              marginTop: '30px',
              padding: '20px',
              background: 'linear-gradient(135.46deg, #E8F4FD 0%, #D1E9FA 100%)',
              borderRadius: '16px',
              fontSize: '15px',
              maxWidth: '450px',
              margin: '25px auto 0',
              border: '1px solid rgba(52, 152, 219, 0.2)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
              color: '#2c3e50'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', justifyContent: 'center' }}>
                <span style={{ fontSize: '20px' }}>📌</span>
                <strong style={{ fontSize: '16px', color: '#2980b9' }}>Información de Seguridad</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ color: '#3498db' }}>•</span>
                  <span>Este código QR es <strong>personal e intransferible</strong> para tu registro de asistencia.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ color: '#3498db' }}>•</span>
                  <span>Por seguridad, <strong>no compartas ni captures</strong> este código con otras personas.</span>
                </div>
              </div>
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