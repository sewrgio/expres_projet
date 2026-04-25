import React, { useState, useEffect } from 'react';
import { IconCheck, IconX, IconScanQR } from '../Icons/SystemIcons';

const LocationAlert = ({ enArea, distancia }) => {
  const [showAlert, setShowAlert] = useState(false);
  const [lastStatus, setLastStatus] = useState(null);

  useEffect(() => {
    // Solo mostrar alerta cuando cambia el estado (de fuera a adentro o viceversa)
    if (lastStatus !== null && lastStatus !== enArea) {
      setShowAlert(true);
      // Ocultar después de 5 segundos
      const timer = setTimeout(() => {
        setShowAlert(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
    setLastStatus(enArea);
  }, [enArea, lastStatus]);

  if (!showAlert) return null;

  const isInside = enArea;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      maxWidth: '380px',
      width: '100%',
      animation: 'slideInAlert 0.4s ease-out',
    }}>
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
        <div style={{
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
        }}>
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
            Ubicación: {isInside ? 'Dentro del campus' : 'Fuera del campus'}
            <br />
            Distancia: {distancia < 1 ? `${(distancia * 1000).toFixed(0)} metros` : `${distancia.toFixed(2)} km`}
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
            <IconScanQR />
            {isInside ? '¡Puede escanear QR!' : 'No puede escanear QR hasta estar en el campus'}
          </div>
        </div>
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
