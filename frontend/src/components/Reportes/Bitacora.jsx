import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const Bitacora = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setCargando(true);
        const res = await api.get('/bitacora');
        setLogs(res.data);
      } catch (err) {
        console.error('Error cargando bitácora:', err);
        setError('Error al cargar la bitácora.');
      } finally {
        setCargando(false);
      }
    };
    fetchLogs();
  }, []);

  if (!user?.roles?.includes('auditor')) {
    return <div className="p-8 text-center text-red-500">Acceso denegado. Solo el auditor puede ver esta página.</div>;
  }

  if (cargando) {
    return <div className="p-8 text-center">Cargando bitácora...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-[#1a237e] mb-2">Bitácora de Auditoría</h2>
      <p className="text-gray-600 mb-6">Registro de accesos y acciones críticas del sistema.</p>

      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Acción</th>
                <th className="hidden md:table-cell px-6 py-4">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(log.fecha).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    {log.usuario_nombre} {log.usuario_apellido}
                    <div className="text-xs text-gray-500">{log.usuario_correo}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-blue-800">
                    {log.accion}
                  </td>
                  <td className="hidden md:table-cell px-6 py-4 text-gray-600">
                    {log.detalles || '-'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                    No hay registros en la bitácora aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Bitacora;
