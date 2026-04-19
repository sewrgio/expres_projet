import React, { useState } from 'react';
import api from '../../services/api';

const GenerarQR = () => {
  const [descripcion, setDescripcion] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [qrGenerado, setQrGenerado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError('');

    try {
      const response = await api.post('/qr/generar', { descripcion, ubicacion });
      setQrGenerado(response.data.qr);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al generar QR');
    } finally {
      setCargando(false);
    }
  };

  const handleImprimir = () => {
    const ventanaImpresion = window.open('', '_blank');
    if (!ventanaImpresion) {
      setError('El navegador bloqueó la ventana emergente. Permite las ventanas emergentes e intenta de nuevo.');
      return;
    }
    ventanaImpresion.document.write(`
      <html>
        <head>
          <title>QR - ${ubicacion || 'Coordinación'}</title>
          <style>
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
            }
            .qr-container {
              text-align: center;
              padding: 30px;
              border: 2px dashed #ccc;
              border-radius: 16px;
              background: white;
            }
            .qr-title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 20px;
              color: #003366;
            }
            .qr-subtitle {
              font-size: 16px;
              color: #666;
              margin-top: 20px;
            }
            .qr-info {
              margin-top: 20px;
              font-size: 14px;
              color: #333;
            }
            img {
              width: 250px;
              height: 250px;
            }
            @media print {
              body { margin: 0; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="qr-title">📚 IUJO Asistencia</div>
            <div class="qr-subtitle">Código QR para Registro</div>
            <img src="${qrGenerado.imagen}" alt="QR Code" />
            <div class="qr-info">
              <p><strong>Ubicación:</strong> ${ubicacion || 'Coordinación'}</p>
              <p><strong>Descripción:</strong> ${descripcion || 'Registro de asistencia'}</p>
              <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
      </html>
    `);
    ventanaImpresion.document.close();
    ventanaImpresion.print();
  };

  const handleDescargar = () => {
    const link = document.createElement('a');
    link.href = qrGenerado.imagen;
    link.download = `qr_${ubicacion || 'coordinacion'}_${Date.now()}.png`;
    link.click();
  };

  return (
    <div>
      <h2 className="page-title">Generar Código QR</h2>

      {!qrGenerado ? (
        <div className="card">
          <h3 className="card-title">Datos del QR</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Ubicación / Punto de control</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej: Entrada Principal, Coordinación, Laboratorio..."
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Descripción (opcional)</label>
              <textarea
                className="form-control"
                rows="3"
                placeholder="Información adicional sobre este punto de control..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={cargando}>
              {cargando ? 'Generando...' : '🔑 Generar QR'}
            </button>
          </form>
          {error && (
            <div style={{ marginTop: '15px', color: 'red', padding: '10px', background: '#fff0f0', borderRadius: '8px' }}>
              ⚠️ {error}
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 className="card-title">QR Generado</h3>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '16px',
            display: 'inline-block',
            margin: '20px auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <img
              src={qrGenerado.imagen}
              alt="QR Code"
              style={{ width: '250px', height: '250px', display: 'block' }}
            />
          </div>

          <div style={{ marginTop: '20px' }}>
            <p><strong>Ubicación:</strong> {ubicacion || 'No especificada'}</p>
            <p><strong>Descripción:</strong> {descripcion || 'Sin descripción'}</p>
            <p><strong>Código:</strong> <code>{qrGenerado.codigo}</code></p>
          </div>

          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleImprimir}>
              🖨️ Imprimir QR
            </button>
            <button className="btn btn-success" onClick={handleDescargar}>
              💾 Descargar QR
            </button>
            <button className="btn btn-secondary" onClick={() => setQrGenerado(null)}>
              🔄 Generar otro QR
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenerarQR;