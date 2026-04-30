import React from 'react';

const InactivityModal = ({ onStay, onLogout }) => {
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
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.3s ease'
      }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '35px 40px',
          maxWidth: '420px',
          width: '90%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          textAlign: 'center',
          animation: 'slideUp 0.3s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: '48px', marginBottom: '15px' }}>⏰</div>
        <h2 style={{ color: '#1e3c72', margin: '0 0 10px', fontSize: '20px' }}>
          Sesión Inactiva
        </h2>
        <p style={{ color: '#666', fontSize: '15px', lineHeight: '1.5', margin: '0 0 25px' }}>
          Has estado inactivo por un tiempo. ¿Deseas mantener tu sesión abierta?
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={onLogout}
            style={{
              padding: '10px 28px',
              borderRadius: '8px',
              border: '2px solid #e74c3c',
              background: 'transparent',
              color: '#e74c3c',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            No, cerrar sesión
          </button>
          <button
            onClick={onStay}
            style={{
              padding: '10px 28px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #1e3c72, #2a5298)',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(30, 60, 114, 0.3)',
              transition: 'all 0.2s'
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
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default InactivityModal;
