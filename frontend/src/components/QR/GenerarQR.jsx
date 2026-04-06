import React, { useState } from 'react';
import api from '../../services/api';

const GenerarQR = () => {
  const [descripcion, setDescripcion] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [qrGenerado, setQrGenerado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const handleGenerar = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError('');
    setQrGenerado(null);

    try {
      const response = await api.post('/qr/generar', { 
        descripcion, 
        ubicacion 
      });
      setQrGenerado(response.data.qr);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al generar QR');
    } finally {
      setCargando(false);
    }
  };

  const handleImprimir = () => {
    const ventana = window.open('');
    ventana.document.write(`
      <html>
        <head>
          <title>QR - ${descripcion || 'Coordinación'}</title>
          <style>
            body { text-align: center; font-family: Arial; padding: 50px; }
            img { width: 300px; height: 300px; margin: 20px 0; }
            h2 { color: #003366; }
            .info { margin: 20px 0; color: #666; }
          </style>
        </head>
        <body>
          <h2>📚 IUJO - Control de Asistencia</h2>
          <h3>${descripcion || 'Coordinación'}</h3>
          <img src="${qrGenerado.imagen}" />
          <div class="info">
            <p><strong>Ubicación:</strong> ${ubicacion || 'No especificada'}</p>
            <p>Escanee este código QR para registrar entrada/salida</p>
            <p><small>Código: ${qrGenerado.codigo}</small></p>
          </div>
          <p>Instituto Universitario de Jesús Obrero</p>
        </body>
      </html>
    `);
    ventana.print();
  };

  return (
    <div className="card">
      <h3 className="card-title">Generar QR para Coordinación</h3>
      <p>Genere un código QR para pegar físicamente en la entrada/salida de la coordinación.</p>
      
      <form onSubmit={handleGenerar}>
        <div className="form-group">
          <label className="form-label">Nombre de la Coordinación *</label>
          <input
            type="text"
            className="form-control"
            placeholder="Ej: Coordinación de Ingeniería Informática"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Ubicación</label>
          <input
            type="text"
            className="form-control"
            placeholder="Ej: Edificio Principal, Piso 2, Oficina 201"
            value={ubicacion}
            onChange={(e) => setUbicacion(e.target.value)}
          />
        </div>
        
        <button type="submit" className="btn btn-primary" disabled={cargando}>
          {cargando ? 'Generando...' : '🔑 Generar QR'}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: '20px', padding: '10px', background: '#ffebee', color: '#c62828', borderRadius: '5px' }}>
          {error}
        </div>
      )}

      {qrGenerado && (
        <div style={{ marginTop: '30px', textAlign: 'center', padding: '20px', background: '#f5f5f5', borderRadius: '10px' }}>
          <h4>QR para: {qrGenerado.descripcion}</h4>
          <img src={qrGenerado.imagen} alt="QR" style={{ width: '200px', height: '200px', margin: '20px 0' }} />
          <p><strong>Ubicación:</strong> {qrGenerado.ubicacion || 'No especificada'}</p>
          
          <div style={{ marginTop: '15px' }}>
            <button className="btn btn-success" onClick={handleImprimir} style={{ marginRight: '10px' }}>
              🖨️ Imprimir QR
            </button>
            <button className="btn btn-primary" onClick={() => navigator.clipboard.writeText(qrGenerado.codigo)}>
              📋 Copiar código
            </button>
          </div>
          
          <p style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
            Pegue este código QR en un lugar visible. Los profesores lo escanearán al entrar y salir.
          </p>
        </div>
      )}
    </div>
  );
};

export default GenerarQR;