import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const AdministrarQR = () => {
  const { user } = useAuth();
  const [qrs, setQrs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  // Estados para el modal de edición
  const [modalEditar, setModalEditar] = useState({
    mostrar: false,
    id_qr: null,
    descripcion: '',
    ubicacion: ''
  });

  // Estados para generar nuevo QR
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoQR, setNuevoQR] = useState({ descripcion: '', ubicacion: '' });

  useEffect(() => {
    cargarQRs();
  }, []);

  const cargarQRs = async () => {
    try {
      setCargando(true);
      const response = await api.get('/qr/mis-qrs');
      setQrs(response.data);
    } catch (err) {
      console.error('Error cargando QRs:', err);
      setError('Error al cargar los códigos QR');
    } finally {
      setCargando(false);
    }
  };

  const generarQR = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/qr/generar', nuevoQR);
      if (response.data.success) {
        setMensaje('QR generado exitosamente');
        setNuevoQR({ descripcion: '', ubicacion: '' });
        setMostrarFormulario(false);
        cargarQRs();
        setTimeout(() => setMensaje(''), 3000);
      }
    } catch (err) {
      console.error('Error generando QR:', err);
      setError(err.response?.data?.error || 'Error al generar QR');
      setTimeout(() => setError(''), 3000);
    }
  };

  const abrirModalEditar = (qr) => {
    setModalEditar({
      mostrar: true,
      id_qr: qr.id_qr,
      descripcion: qr.descripcion || '',
      ubicacion: qr.ubicacion || ''
    });
  };

  const cerrarModalEditar = () => {
    setModalEditar({
      mostrar: false,
      id_qr: null,
      descripcion: '',
      ubicacion: ''
    });
  };

  const guardarEdicion = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put(`/qr/${modalEditar.id_qr}`, {
        descripcion: modalEditar.descripcion,
        ubicacion: modalEditar.ubicacion
      });
      if (response.data.success) {
        setMensaje('QR actualizado correctamente');
        cerrarModalEditar();
        cargarQRs();
        setTimeout(() => setMensaje(''), 3000);
      }
    } catch (err) {
      console.error('Error editando QR:', err);
      setError(err.response?.data?.error || 'Error al editar QR');
      setTimeout(() => setError(''), 3000);
    }
  };

  const desactivarQR = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas desactivar este QR?')) {
      return;
    }
    try {
      const response = await api.put(`/qr/desactivar/${id}`);
      if (response.data.success) {
        setMensaje('QR desactivado correctamente');
        cargarQRs();
        setTimeout(() => setMensaje(''), 3000);
      }
    } catch (err) {
      console.error('Error desactivando QR:', err);
      setError('Error al desactivar QR');
      setTimeout(() => setError(''), 3000);
    }
  };

  const descargarQR = (qr) => {
    const link = document.createElement('a');
    link.href = qr.imagen_qr || qr.imagen;
    link.download = `QR_${qr.codigo_qr || qr.codigo}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (cargando) {
    return <div className="card">Cargando códigos QR...</div>;
  }

  return (
    <>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 className="card-title" style={{ margin: 0 }}>Administrar mis QR</h3>
          <p style={{ margin: '5px 0 0 0', color: '#666' }}>Genera y administra los códigos QR para el registro de asistencia</p>
        </div>
        <button
          className={mostrarFormulario ? "btn btn-secondary" : "btn btn-primary"}
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
        >
          {mostrarFormulario ? 'Cancelar' : 'Generar Nuevo QR'}
        </button>
      </div>

      {mensaje && <div style={{ padding: '10px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '4px', marginBottom: '15px' }}>{mensaje}</div>}
      {error && <div style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '15px' }}>{error}</div>}

      {/* Formulario para generar nuevo QR */}
      {mostrarFormulario && (
        <div className="card">
          <h3 className="card-title">Generar Nuevo QR</h3>
          <form onSubmit={generarQR}>
            <div className="form-group">
              <label>Descripción (opcional):</label>
              <input
                type="text"
                className="form-control"
                value={nuevoQR.descripcion}
                onChange={(e) => setNuevoQR({ ...nuevoQR, descripcion: e.target.value })}
                placeholder="Ej: QR para entrada principal"
              />
            </div>
            <div className="form-group">
              <label>Ubicación (opcional):</label>
              <input
                type="text"
                className="form-control"
                value={nuevoQR.ubicacion}
                onChange={(e) => setNuevoQR({ ...nuevoQR, ubicacion: e.target.value })}
                placeholder="Ej: Entrada principal del edificio A"
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary">
                Generar QR
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setMostrarFormulario(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de QR existentes */}
      <div className="card">
        <h3 className="card-title">Mis Códigos QR</h3>
        {qrs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📱</div>
            <h4 style={{ color: '#003366', margin: '0 0 8px 0' }}>No tienes códigos QR generados</h4>
            <p style={{ color: '#666', margin: 0 }}>Haz clic en "Generar Nuevo QR" para crear tu primer código QR.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>QR</th>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th>Ubicación</th>
                  <th>Estado</th>
                  <th>Creado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {qrs.map((qr) => (
                  <tr key={qr.id_qr} style={{ opacity: qr.activo ? 1 : 0.6 }}>
                    <td>
                      <img
                        src={qr.imagen_qr || qr.imagen}
                        alt={`QR ${qr.codigo_qr || qr.codigo}`}
                        style={{ width: '60px', height: '60px', objectFit: 'contain', backgroundColor: '#fff', padding: '2px', borderRadius: '4px', border: '1px solid #ddd' }}
                      />
                    </td>
                    <td><code style={{ background: '#f4f4f4', padding: '4px 8px', borderRadius: '4px' }}>{qr.codigo_qr || qr.codigo}</code></td>
                    <td>{qr.descripcion || '-'}</td>
                    <td>{qr.ubicacion || '-'}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: qr.activo ? '#d4edda' : '#e2e3e5',
                        color: qr.activo ? '#155724' : '#383d41'
                      }}>
                        {qr.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>{new Date(qr.fecha_creacion).toLocaleDateString('es-VE')}</td>
                    <td>
                      <button 
                        className="btn btn-primary btn-sm" 
                        style={{ marginRight: '5px' }} 
                        onClick={() => descargarQR(qr)}
                        title="Descargar"
                      >
                        ⬇️
                      </button>
                      <button 
                        className="btn btn-warning btn-sm" 
                        style={{ marginRight: '5px' }} 
                        onClick={() => abrirModalEditar(qr)}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      {qr.activo && (
                        <button 
                          className="btn btn-danger btn-sm" 
                          onClick={() => desactivarQR(qr.id_qr)}
                          title="Desactivar"
                        >
                          🚫
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de edición */}
      {modalEditar.mostrar && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Editar QR</h3>
            <form onSubmit={guardarEdicion}>
              <div className="form-group">
                <label>Descripción:</label>
                <input
                  type="text"
                  className="form-control"
                  value={modalEditar.descripcion}
                  onChange={(e) => setModalEditar({ ...modalEditar, descripcion: e.target.value })}
                  placeholder="Ej: QR para entrada principal"
                />
              </div>
              <div className="form-group">
                <label>Ubicación:</label>
                <input
                  type="text"
                  className="form-control"
                  value={modalEditar.ubicacion}
                  onChange={(e) => setModalEditar({ ...modalEditar, ubicacion: e.target.value })}
                  placeholder="Ej: Entrada principal del edificio A"
                />
              </div>
              <div className="modal-buttons">
                <button type="submit" className="btn btn-primary">
                  Guardar Cambios
                </button>
                <button type="button" className="btn btn-secondary" onClick={cerrarModalEditar}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          padding: 25px;
          border-radius: 12px;
          min-width: 400px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .modal-buttons {
          display: flex;
          gap: 10px;
          margin-top: 20px;
          justify-content: flex-end;
        }
        .btn-sm {
          padding: 5px 10px;
          font-size: 14px;
        }
      `}</style>
    </>
  );
};

export default AdministrarQR;
