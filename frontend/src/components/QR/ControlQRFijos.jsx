import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const ControlQRFijos = () => {
  const { user } = useAuth();
  const [qrs, setQrs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoQR, setNuevoQR] = useState({ nombre: '', codigo: '' });
  const [modalDesactivar, setModalDesactivar] = useState({
    mostrar: false,
    id_qr_fijo: null,
    nombre: ''
  });
  const [modalActivar, setModalActivar] = useState({
    mostrar: false,
    id_qr_fijo: null,
    nombre: ''
  });

  useEffect(() => {
    cargarQRsEstaticos();
  }, []);

  const cargarQRsEstaticos = async () => {
    try {
      setCargando(true);
      const response = await api.get('/qr/estaticos');
      if (response.data.success) {
        setQrs(response.data.qrs);
      }
    } catch (err) {
      console.error('Error cargando QRs estáticos:', err);
      setError('Error al cargar los códigos QR');
    } finally {
      setCargando(false);
    }
  };

  const descargarQR = (qr) => {
    const link = document.createElement('a');
    link.href = qr.imagen;
    link.download = `QR_${qr.nombre.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activarQR = async (id) => {
    try {
      const response = await api.put(`/qr/fijos/${id}/activar`);
      if (response.data.success) {
        setMensaje('QR activado correctamente');
        cargarQRsEstaticos();
        setTimeout(() => setMensaje(''), 3000);
      }
    } catch (err) {
      console.error('Error activando QR:', err);
      setError('Error al activar el QR');
    }
  };

  const mostrarModalDesactivar = (qr) => {
    setModalDesactivar({
      mostrar: true,
      id_qr_fijo: qr.id_qr_fijo,
      nombre: qr.nombre
    });
  };

  const cerrarModalDesactivar = () => {
    setModalDesactivar({
      mostrar: false,
      id_qr_fijo: null,
      nombre: ''
    });
  };

  const handleDesactivar = async () => {
    try {
      const response = await api.put(`/qr/fijos/${modalDesactivar.id_qr_fijo}/desactivar`);
      if (response.data.success) {
        setMensaje('QR desactivado correctamente');
        cargarQRsEstaticos();
        cerrarModalDesactivar();
        setTimeout(() => setMensaje(''), 3000);
      }
    } catch (err) {
      console.error('Error desactivando QR:', err);
      setError('Error al desactivar el QR');
      cerrarModalDesactivar();
    }
  };

  const mostrarModalActivar = (qr) => {
    setModalActivar({
      mostrar: true,
      id_qr_fijo: qr.id_qr_fijo,
      nombre: qr.nombre
    });
  };

  const cerrarModalActivar = () => {
    setModalActivar({
      mostrar: false,
      id_qr_fijo: null,
      nombre: ''
    });
  };

  const handleActivar = async () => {
    try {
      const response = await api.put(`/qr/fijos/${modalActivar.id_qr_fijo}/activar`);
      if (response.data.success) {
        setMensaje('QR activado correctamente');
        cargarQRsEstaticos();
        cerrarModalActivar();
        setTimeout(() => setMensaje(''), 3000);
      }
    } catch (err) {
      console.error('Error activando QR:', err);
      setError('Error al activar el QR');
      cerrarModalActivar();
    }
  };

  const crearQR = async (e) => {
    e.preventDefault();
    if (!nuevoQR.nombre || !nuevoQR.codigo) {
      setError('Nombre y código son requeridos');
      return;
    }
    try {
      const response = await api.post('/qr/fijos', nuevoQR);
      if (response.data.success) {
        setMensaje('QR creado correctamente');
        setNuevoQR({ nombre: '', codigo: '' });
        setMostrarFormulario(false);
        cargarQRsEstaticos();
        setTimeout(() => setMensaje(''), 3000);
      }
    } catch (err) {
      console.error('Error creando QR:', err);
      setError(err.response?.data?.error || 'Error al crear el QR');
    }
  };

  if (cargando) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Cargando códigos QR...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '600', color: '#1a237e', margin: '0 0 8px 0' }}>
            Control de QR Fijos
          </h1>
          <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
            Códigos QR estáticos para las coordinaciones del IUJO
          </p>
        </div>
        <button
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          style={{
            backgroundColor: '#4caf50',
            color: '#fff',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          {mostrarFormulario ? 'Cancelar' : 'Agregar Nuevo QR'}
        </button>
      </div>

      {mensaje && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#e8f5e9',
          color: '#2e7d32',
          borderRadius: '6px',
          marginBottom: '16px'
        }}>
          {mensaje}
        </div>
      )}

      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '6px',
          marginBottom: '16px'
        }}>
          {error}
          <button onClick={() => setError('')} style={{ marginLeft: '10px', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {mostrarFormulario && (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '1px solid #e0e0e0',
          marginBottom: '24px'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#1a237e' }}>Agregar Nuevo QR Fijo</h3>
          <form onSubmit={crearQR}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '500' }}>
                Nombre de la Coordinación:
              </label>
              <input
                type="text"
                value={nuevoQR.nombre}
                onChange={(e) => setNuevoQR({ ...nuevoQR, nombre: e.target.value })}
                placeholder="Ej: Arquitectura"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '500' }}>
                Código QR:
              </label>
              <input
                type="text"
                value={nuevoQR.codigo}
                onChange={(e) => setNuevoQR({ ...nuevoQR, codigo: e.target.value })}
                placeholder="Ej: COORD_ARQUITECTURA"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                style={{
                  backgroundColor: '#4caf50',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Crear QR
              </button>
              <button
                type="button"
                onClick={() => setMostrarFormulario(false)}
                style={{
                  backgroundColor: '#757575',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px'
      }}>
        {qrs.map((qr) => (
          <div
            key={qr.id_qr_fijo}
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: qr.activo ? '2px solid #4caf50' : '2px solid #f44336',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              opacity: qr.activo ? 1 : 0.7
            }}
          >
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1a237e',
              marginBottom: '8px',
              textAlign: 'center'
            }}>
              {qr.nombre}
            </div>

            <div style={{
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '500',
              marginBottom: '12px',
              backgroundColor: qr.activo ? '#e8f5e9' : '#ffebee',
              color: qr.activo ? '#2e7d32' : '#c62828'
            }}>
              {qr.activo ? 'Activo' : 'Inactivo'}
            </div>

            <div style={{
              backgroundColor: '#f5f5f5',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <img
                src={qr.imagen}
                alt={`QR ${qr.nombre}`}
                style={{
                  width: '180px',
                  height: '180px',
                  display: 'block',
                  filter: qr.activo ? 'none' : 'grayscale(100%)'
                }}
              />
            </div>

            <div style={{
              fontSize: '12px',
              color: '#666',
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              textAlign: 'center',
              marginBottom: '16px',
              padding: '8px 12px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              width: '100%'
            }}>
              {qr.codigo}
            </div>

            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <button
                onClick={() => descargarQR(qr)}
                style={{
                  flex: 1,
                  backgroundColor: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                Descargar
              </button>
              {qr.activo ? (
                <button
                  onClick={() => mostrarModalDesactivar(qr)}
                  style={{
                    flex: 1,
                    backgroundColor: '#f44336',
                    color: '#fff',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                >
                  Desactivar
                </button>
              ) : (
                <button
                  onClick={() => mostrarModalActivar(qr)}
                  style={{
                    flex: 1,
                    backgroundColor: '#4caf50',
                    color: '#fff',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                >
                  Activar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '32px',
        padding: '16px 20px',
        backgroundColor: '#e3f2fd',
        borderRadius: '8px',
        border: '1px solid #bbdefb'
      }}>
        <div style={{ fontSize: '14px', color: '#1565c0', fontWeight: '500', marginBottom: '8px' }}>
          Información importante:
        </div>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#424242' }}>
          <li>Los QR inactivos no podrán ser escaneados por los profesores</li>
          <li>Cada QR tiene un código único que no se puede repetir</li>
          <li>Los códigos QR inactivos aparecen en escala de grises</li>
          <li>Puedes agregar nuevas coordinaciones según sea necesario</li>
        </ul>
      </div>

      {/* Modal de confirmación para desactivar */}
      {modalDesactivar.mostrar && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                backgroundColor: '#ffebee',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                fontSize: '30px'
              }}>
                ⚠️
              </div>
              <h3 style={{ margin: '0 0 8px 0', color: '#1a237e' }}>
                ¿Desactivar QR?
              </h3>
              <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>
                ¿Estás seguro que quieres desactivar el QR de <strong>{modalDesactivar.nombre}</strong>?
                Los profesores no podrán escanear este código hasta que se reactive.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={cerrarModalDesactivar}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDesactivar}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#f44336',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Sí, desactivar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para activar */}
      {modalActivar.mostrar && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                backgroundColor: '#e8f5e9',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                fontSize: '30px'
              }}>
                ✓
              </div>
              <h3 style={{ margin: '0 0 8px 0', color: '#1a237e' }}>
                ¿Activar QR?
              </h3>
              <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>
                ¿Estás seguro que quieres activar el QR de <strong>{modalActivar.nombre}</strong>?
                Los profesores podrán escanear este código nuevamente.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={cerrarModalActivar}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleActivar}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#4caf50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Sí, activar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlQRFijos;
