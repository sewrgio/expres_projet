import React, { useState, useEffect } from 'react';

const InactivityModal = ({ onStay, onLogout }) => {
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutos = 180 segundos

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onLogout]);

  // Formatear segundos en formato MM:SS
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Calcular porcentaje de tiempo restante para la barra de progreso
  const percentage = (timeLeft / 180) * 100;

  const handleBackdropClick = (e) => {
    // No permitir cerrar el modal haciendo clic fuera
    e.stopPropagation();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(5px)',
        animation: 'fadeIn 0.3s ease'
      }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '24px',
          padding: '35px 30px',
          maxWidth: '440px',
          width: '90%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          textAlign: 'center',
          animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icono animado */}
        <div style={{ 
          fontSize: '56px', 
          marginBottom: '15px',
          animation: timeLeft <= 30 ? 'pulseGlow 1s infinite alternate' : 'none'
        }}>
          ⏰
        </div>
        
        <h2 style={{ 
          color: '#1e3c72', 
          margin: '0 0 10px', 
          fontSize: '22px',
          fontWeight: '800',
          letterSpacing: '-0.5px'
        }}>
          Sesión Inactiva
        </h2>
        
        <p style={{ 
          color: '#4b5563', 
          fontSize: '14.5px', 
          lineHeight: '1.6', 
          margin: '0 0 20px',
          fontWeight: '500'
        }}>
          Has estado inactivo por un tiempo. ¿Deseas mantener tu sesión abierta en el sistema?
        </p>

        {/* Barra de progreso de tiempo restante */}
        <div style={{
          width: '100%',
          height: '6px',
          backgroundColor: '#e5e7eb',
          borderRadius: '10px',
          overflow: 'hidden',
          marginBottom: '15px',
          position: 'relative'
        }}>
          <div style={{
            width: `${percentage}%`,
            height: '100%',
            background: timeLeft <= 30 
              ? 'linear-gradient(90deg, #ef4444, #dc2626)' // Rojo peligro si queda poco tiempo
              : 'linear-gradient(90deg, #3b82f6, #1d4ed8)', // Azul corporativo por defecto
            borderRadius: '10px',
            transition: 'width 1s linear, background-color 0.5s ease'
          }} />
        </div>

        {/* Cronómetro visual dinámico */}
        <div style={{
          backgroundColor: timeLeft <= 30 ? '#fef2f2' : '#f0f9ff',
          border: timeLeft <= 30 ? '1px solid #fecaca' : '1px solid #e0f2fe',
          borderRadius: '14px',
          padding: '10px 15px',
          color: timeLeft <= 30 ? '#ef4444' : '#0369a1',
          fontWeight: '700',
          fontSize: '13.5px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '30px',
          transition: 'all 0.3s ease'
        }}>
          <span style={{ 
            display: 'inline-block', 
            animation: timeLeft <= 30 ? 'shake 0.5s infinite alternate' : 'none' 
          }}>⚠️</span>
          La sesión se cerrará automáticamente en: 
          <span style={{ 
            fontFamily: 'monospace', 
            fontSize: '15px',
            backgroundColor: timeLeft <= 30 ? '#fee2e2' : '#bae6fd',
            padding: '2px 8px',
            borderRadius: '6px',
            marginLeft: '4px'
          }}>
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* Botones de acción */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={onLogout}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: '14px',
              border: '2px solid #ef4444',
              background: 'transparent',
              color: '#ef4444',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#fef2f2';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            No, cerrar sesión
          </button>
          <button
            onClick={onStay}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #1e3c72, #2a5298)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(30, 60, 114, 0.25)',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(30, 60, 114, 0.35)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(30, 60, 114, 0.25)';
            }}
          >
            Sí, continuar
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulseGlow {
          from { transform: scale(1); filter: drop-shadow(0 0 2px rgba(239, 68, 68, 0.2)); }
          to { transform: scale(1.1); filter: drop-shadow(0 0 10px rgba(239, 68, 68, 0.6)); }
        }
        @keyframes shake {
          0% { transform: rotate(-5deg); }
          100% { transform: rotate(5deg); }
        }
      `}</style>
    </div>
  );
};

export default InactivityModal;
