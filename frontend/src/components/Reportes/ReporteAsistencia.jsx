import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const ReporteAsistencia = () => {
  const [asistencias, setAsistencias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  useEffect(() => {
    cargarAsistencias();
  }, []);

  const cargarAsistencias = async () => {
    setCargando(true);
    try {
      let url = '/asistencias';
      if (fechaInicio && fechaFin) {
        url += `?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
      }
      const response = await api.get(url);
      setAsistencias(response.data);
    } catch (error) {
      console.error('Error cargando asistencias:', error);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="card">
      <h3 className="card-title">Reporte de Asistencias</h3>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="date"
          className="form-control"
          style={{ width: 'auto' }}
          value={fechaInicio}
          onChange={(e) => setFechaInicio(e.target.value)}
        />
        <input
          type="date"
          className="form-control"
          style={{ width: 'auto' }}
          value={fechaFin}
          onChange={(e) => setFechaFin(e.target.value)}
        />
        <button className="btn btn-primary" onClick={cargarAsistencias}>Filtrar</button>
        <button className="btn btn-warning" onClick={() => { setFechaInicio(''); setFechaFin(''); cargarAsistencias(); }}>
          Limpiar
        </button>
      </div>

      {cargando ? (
        <div style={{ textAlign: 'center' }}>Cargando...</div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Profesor</th>
                <th>Fecha</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th>Horas</th>
                <th>Ubicación</th>
              </tr>
            </thead>
            <tbody>
              {asistencias.map(asis => {
                const entrada = new Date(asis.fecha_entrada);
                const salida = asis.fecha_salida ? new Date(asis.fecha_salida) : null;
                const horas = salida ? ((salida - entrada) / (1000 * 60 * 60)).toFixed(1) : '-';
                return (
                  <tr key={asis.id_asistencia}>
                    <td>{asis.nombre} {asis.apellido}</td>
                    <td>{entrada.toLocaleDateString()}</td>
                    <td>{entrada.toLocaleTimeString()}</td>
                    <td>{salida ? salida.toLocaleTimeString() : '--'}</td>
                    <td>{horas}</td>
                    <td>{asis.ubicacion || '-'}</td>
                  </tr>
                );
              })}
              {asistencias.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center' }}>No hay asistencias registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ReporteAsistencia;