import React, { useState, useEffect, useRef } from 'react';
import { IconCheck, IconX, IconScanQR } from '../Icons/SystemIcons';

const LocationAlert = ({ enArea, distancia }) => {
  const [showAlert, setShowAlert] = useState(false);
  const prevEnArea = useRef(null);
  const prevDistancia = useRef(undefined);

  useEffect(() => {
    const prev = prevEnArea.current;
    const prevDist = prevDistancia.current;
    
    prevEnArea.current = enArea;
    prevDistancia.current = distancia;

    // Mostrar alerta inicialmente o cuando cambia el estado
    if (prev === null || prev !== enArea || prevDist !== distancia) {
      setShowAlert(true);
      
      // Solo ocultar automáticamente si está dentro del área
      if (enArea) {
        const timer = setTimeout(() => {
          setShowAlert(false);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [enArea, distancia]);

  if (!showAlert) return null;

  const isInside = enArea;

  return (
    <div 
      role="alert" 
      aria-live="assertive"
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        maxWidth: '380px',
        width: '100%',
        animation: 'slideInAlert 0.4s ease-out',
      }}
    >
      <div style={{
        background: isInside 
          ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)'
          : 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: isInside
          ? '0 12px 40px rgba(67, 160, 71, 0.25)'
          : '0 12px 40px rgba(211, 47, 47, 0.25)',
        border: `2px solid ${isInside ? '#43a047' : '#e53935'}`,
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-start',
      }}>
        <div 
          aria-hidden="true"
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: isInside
              ? 'linear-gradient(135deg, #43a047 0%, #388e3c 100%)'
              : 'linear-gradient(135deg, #e53935 0%, #d32f2f 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: 'white',
          }}
        >
          {isInside ? <IconCheck /> : <IconX />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '16px',
            fontWeight: '700',
            color: isInside ? '#2e7d32' : '#c62828',
            marginBottom: '6px',
            lineHeight: 1.3,
          }}>
            {isInside ? '¡Está en el campus!' : 'No está en los parámetros establecidos'}
          </div>
          <div style={{
            fontSize: '14px',
            color: isInside ? '#1b5e20' : '#7f0000',
            lineHeight: 1.5,
          }}>
            {distancia === null || distancia === undefined ? (
              'Esperando datos de ubicación de la app móvil...'
            ) : (
              <>
                Ubicación: {isInside ? 'Dentro del campus' : 'Fuera del campus'}
                <br />
                Distancia: {distancia < 1 
                  ? `${(distancia * 1000).toFixed(0)} metros` 
                  : `${distancia.toFixed(2)} km`}
              </>
            )}
          </div>
          <div style={{
            marginTop: '12px',
            padding: '10px 14px',
            background: isInside
              ? 'rgba(67, 160, 71, 0.1)'
              : 'rgba(211, 47, 47, 0.1)',
            borderRadius: '10px',
            fontSize: '13px',
            color: isInside ? '#1b5e20' : '#7f0000',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <IconScanQR aria-hidden="true" />
            {isInside ? '¡Puede escanear QR!' : 'No puede escanear QR hasta estar en el campus'}
          </div>
        </div>
        <button
          onClick={() => setShowAlert(false)}
          aria-label="Cerrar alerta de ubicación"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '24px',
            color: isInside ? '#2e7d32' : '#c62828',
            opacity: 0.6,
            padding: '4px',
            lineHeight: 1,
            transition: 'opacity 0.2s',
            outline: 'none'
          }}
          onMouseEnter={(e) => e.target.style.opacity = '1'}
          onMouseLeave={(e) => e.target.style.opacity = '0.6'}
        >
          ×
        </button>
      </div>

      <style>{`
        @keyframes slideInAlert {
          from {
            opacity: 0;
            transform: translateX(100px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default LocationAlert;
