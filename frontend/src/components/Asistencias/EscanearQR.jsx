import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../../services/api';

const EscanearQR = () => {
  const [scanning, setScanning] = useState(true);
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [estado, setEstado] = useState({ dentro: false });

  useEffect(() => {
    cargarEstado();
    
    const scanner = new Html5QrcodeScanner('qr-reader', {
      fps: 10,
      qrbox: { width: 250, height: 250 }
    });

    scanner.render(onScanSuccess, onScanError);

    return () => {
      scanner.clear();
    };
  }, []);

  const cargarEstado = async () => {
    try {
      const response = await api.get('/asistencias/estado');
      setEstado(response.data);
    } catch (error) {
      console.error('Error cargando estado:', error);
    }
  };

  const onScanSuccess = async (decodedText) => {
    if (!scanning) return;
    setScanning(false);
    setLoading(true);

    try {
      const response = await api.post('/asistencias/escanear', {
        codigo_qr: decodedText
      });
      setResultado({ 
        success: true, 
        message: response.data.message,
        tipo: response.data.tipo,
        hora: response.data.hora
      });
      await cargarEstado();
    } catch (error) {
      setResultado({ 
        success: false, 
        message: error.response?.data?.error || 'Error al registrar' 
      });
    } finally {
      setLoading(false);
    }
  };

  const onScanError = (error) => {
    console.warn(error);
  };

  const resetScanner = () => {
    setScanning(true);
    setResultado(null);
    window.location.reload();
  };

  return (
    <div className="card">
      <h3 className="card-title">Registro de Asistencia</h3>
      
      <div style={{ 
        textAlign: 'center', 
        padding: '20px', 
        marginBottom: '20px',
        borderRadius: '10px',
        backgroundColor: estado.dentro ? '#d4edda' : '#fff3cd'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '10px' }}>
          {estado.dentro ? '✅' : '⭕'}
        </div>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
          {estado.dentro ? 'Actualmente DENTRO' : 'Actualmente FUERA'}
        </div>
        <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
          Hora actual: {new Date().toLocaleTimeString()}
        </div>
      </div>
      
      <p style={{ marginBottom: '15px', textAlign: 'center' }}>
        {estado.dentro 
          ? '🔴 Escanee el QR para registrar su SALIDA' 
          : '🟢 Escanee el QR para registrar su ENTRADA'}
      </p>
      
      {!resultado && (
        <div id="qr-reader" style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}></div>
      )}
      
      {loading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div>Procesando...</div>
        </div>
      )}
      
      {resultado && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <div className={resultado.success ? 'btn-success' : 'btn-danger'} 
               style={{ padding: '15px', borderRadius: '8px' }}>
            <strong>{resultado.message}</strong>
            <br />
            <small>Hora: {resultado.hora}</small>
          </div>
          <button className="btn btn-primary" onClick={resetScanner} style={{ marginTop: '15px' }}>
            Escanear otro QR
          </button>
        </div>
      )}
    </div>
  );
};

export default EscanearQR;