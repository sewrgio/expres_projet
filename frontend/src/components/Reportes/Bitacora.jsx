import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { 
  IconClipboard, IconSearch, IconAlert, IconCheck, 
  IconInfo, IconClock, IconChevronRight, IconDownload
} from '../Icons/SystemIcons';

const Bitacora = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  
  // Estados para búsqueda y filtrado
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');

  // Estados para exportación manual
  const [exportando, setExportando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const [mensajeError, setMensajeError] = useState('');

  const fetchLogs = async () => {
    try {
      const res = await api.get('/bitacora');
      setLogs(res.data);
    } catch (err) {
      console.error('Error cargando bitácora:', err);
    }
  };

  const exportarBitacora = async () => {
    try {
      setExportando(true);
      setMensajeExito('');
      setMensajeError('');
      
      // 1. Forzar la generación del archivo en el servidor
      await api.post('/bitacora/exportar');
      
      // 2. Descargar el archivo físicamente desde el navegador usando responseType blob
      const res = await api.get('/bitacora/descargar', { responseType: 'blob' });
      
      // 3. Crear el link temporal y simular la descarga
      const blob = new Blob([res.data], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      const ahora = new Date();
      const nombresMeses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      const nombreMes = nombresMeses[ahora.getMonth()];
      
      link.href = url;
      link.setAttribute('download', `bitacora_${nombreMes}_${ahora.getFullYear()}.txt`);
      document.body.appendChild(link);
      link.click();
      
      // Limpieza de memoria y DOM
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setMensajeExito(`¡Éxito! La bitácora se guardó en el servidor (/exports) y se descargó automáticamente en tu navegador.`);
      
      // Recargar logs para ver el registro de exportación en la bitácora
      await fetchLogs();
    } catch (err) {
      console.error('Error exportando:', err);
      setMensajeError(err.response?.data?.error || 'Error al exportar y descargar la bitácora.');
    } finally {
      setExportando(false);
    }
  };

  useEffect(() => {
    let intervalId;

    const load = async () => {
      try {
        setCargando(true);
        await fetchLogs();
      } catch (err) {
        setError('Error al cargar la bitácora de auditoría.');
      } finally {
        setCargando(false);
      }
    };

    load().then(() => {
      // Iniciar polling silencioso en tiempo real (cada 5 segundos) tras la carga inicial
      intervalId = setInterval(() => {
        fetchLogs();
      }, 5000);
    });

    // Limpieza de memoria (Clean-up) al desmontar el componente
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  

  // Filtrar logs según búsqueda y categoría seleccionada
  const filteredLogs = logs.filter((log) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      log.accion?.toLowerCase().includes(term) ||
      log.detalles?.toLowerCase().includes(term) ||
      `${log.usuario_nombre} ${log.usuario_apellido}`.toLowerCase().includes(term) ||
      log.usuario_correo?.toLowerCase().includes(term);

    if (filtroCategoria === 'todos') return matchesSearch;
    if (filtroCategoria === 'asistencias') {
      return matchesSearch && (log.accion === 'ASISTENCIA_ENTRADA' || log.accion === 'ASISTENCIA_SALIDA');
    }
    if (filtroCategoria === 'rechazos') {
      return matchesSearch && log.accion.startsWith('ASISTENCIA_RECHAZADA');
    }
    if (filtroCategoria === 'qr') {
      return matchesSearch && log.accion.includes('_QR');
    }
    if (filtroCategoria === 'roles') {
      return matchesSearch && log.accion === 'CAMBIO_ROL_DEDICACION';
    }
    if (filtroCategoria === 'sistema') {
      return matchesSearch && (log.accion.startsWith('SISTEMA_') || log.accion.startsWith('EXPORTACION_'));
    }
    return matchesSearch;
  });

  // Calcular métricas para el Dashboard
  const totalLogs = logs.length;
  const exitosas = logs.filter(l => l.accion === 'ASISTENCIA_ENTRADA' || l.accion === 'ASISTENCIA_SALIDA').length;
  const rechazadas = logs.filter(l => l.accion.startsWith('ASISTENCIA_RECHAZADA')).length;
  const configuraciones = logs.filter(l => 
    l.accion.includes('_QR') || 
    l.accion === 'CAMBIO_ROL_DEDICACION' ||
    l.accion.startsWith('SISTEMA_') ||
    l.accion.startsWith('EXPORTACION_')
  ).length;

  // Obtener Iniciales del nombre
  const getInitials = (nombre, apellido) => {
    return `${nombre?.[0] || ''}${apellido?.[0] || ''}`.toUpperCase();
  };

  // Badge de color por acción
  const getBadgeStyle = (accion) => {
    if (accion.startsWith('ASISTENCIA_RECHAZADA')) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    if (accion === 'ASISTENCIA_ENTRADA') {
      return 'bg-green-50 text-green-700 border-green-200';
    }
    if (accion === 'ASISTENCIA_SALIDA') {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (accion === 'CAMBIO_ROL_DEDICACION') {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium animate-pulse">Obteniendo logs de auditoría en tiempo real...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl border border-red-100 max-w-xl mx-auto mt-12 shadow-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 bg-gradient-to-r from-indigo-900 to-indigo-950 p-6 rounded-2xl shadow-xl text-white">
        <div>
          <h2 className="text-3xl font-extrabold flex items-center gap-3">
            <span className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
              <IconClipboard className="w-8 h-8 text-indigo-300" />
            </span>
            Bitácora de Auditoría Global
          </h2>
          <p className="text-indigo-200/80 mt-2 text-sm max-w-xl">
            Visor de transacciones del sistema. Permite auditar qué se afectó, el efecto en el sistema, marcas de entrada/salida y reconfiguraciones de roles de dedicación.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <button
            onClick={exportarBitacora}
            disabled={exportando}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md shadow-emerald-500/20 text-xs border border-emerald-400/20 transition-all disabled:opacity-50"
          >
            <IconDownload className="w-4 h-4" />
            {exportando ? 'Exportando...' : 'Exportar Bitácora (.TXT)'}
          </button>
          
          <div className="flex items-center space-x-2 text-xs bg-indigo-800/40 px-3 py-1.5 rounded-lg border border-indigo-500/30 w-fit">
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
            <span className="font-semibold text-indigo-100">Monitoreo Activo</span>
          </div>
        </div>
      </div>

      {/* Alertas de Exportación */}
      {mensajeExito && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center space-x-3">
            <span className="p-2 bg-emerald-500 rounded-xl text-white shadow-sm">
              <IconCheck className="w-5 h-5" />
            </span>
            <div>
              <p className="font-bold text-sm">Exportación Exitosa</p>
              <p className="text-xs text-emerald-700 mt-0.5">{mensajeExito}</p>
            </div>
          </div>
          <button onClick={() => setMensajeExito('')} className="text-emerald-500 hover:text-emerald-700 text-xs font-bold px-2 py-1">✕</button>
        </div>
      )}

      {mensajeError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center space-x-3">
            <span className="p-2 bg-red-500 rounded-xl text-white shadow-sm">
              <IconAlert className="w-5 h-5" />
            </span>
            <div>
              <p className="font-bold text-sm">Fallo de Exportación</p>
              <p className="text-xs text-red-700 mt-0.5">{mensajeError}</p>
            </div>
          </div>
          <button onClick={() => setMensajeError('')} className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1">✕</button>
        </div>
      )}

      {/* KPI Dashboard Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Transacciones</p>
            <h3 className="text-3xl font-bold text-gray-800 mt-1">{totalLogs}</h3>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl text-gray-500">
            <IconClipboard className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Firmas Exitosas</p>
            <h3 className="text-3xl font-bold text-emerald-600 mt-1">{exitosas}</h3>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-500">
            <IconCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wider">Intentos Bloqueados</p>
            <h3 className="text-3xl font-bold text-red-600 mt-1">{rechazadas}</h3>
          </div>
          <div className="p-3 bg-red-50 rounded-xl text-red-500">
            <IconAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-purple-500 uppercase tracking-wider font-medium">Ajustes del Sistema</p>
            <h3 className="text-3xl font-bold text-purple-600 mt-1">{configuraciones}</h3>
          </div>
          <div className="p-3 bg-purple-50 rounded-xl text-purple-500">
            <IconInfo className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros Interactiva */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Campo de Búsqueda */}
          <div className="relative flex-1 max-w-lg">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
              <IconSearch className="w-5 h-5" />
            </span>
            <input
              type="text"
              placeholder="Buscar por usuario, correo, acción o detalle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-gray-700"
            />
          </div>
          
          {/* Filtros Rápidos */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'asistencias', label: 'Asistencias' },
              { id: 'rechazos', label: 'Bloqueos' },
              { id: 'qr', label: 'Gestión QR' },
              { id: 'roles', label: 'Roles / Dedicación' },
              { id: 'sistema', label: 'Sistema / Servidor' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setFiltroCategoria(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  filtroCategoria === cat.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

       {/* Vista de Dispositivos Móviles / Tablets (Tarjetas Premium sin scrollbar) */}
      <div className="block md:hidden space-y-4">
        {filteredLogs.map((log) => {
          const partes = log.detalles?.split('. ') || [];
          const descripcionAccion = partes[0] || '';
          const efectoAccion = partes.slice(1).join('. ') || '';
          
          const esSistema = !log.usuario_nombre;
          const iniciales = esSistema ? 'SYS' : getInitials(log.usuario_nombre, log.usuario_apellido);
          const nombreCompleto = esSistema ? 'SISTEMA' : `${log.usuario_nombre} ${log.usuario_apellido}`;
          const correoCompleto = esSistema ? 'sistema@iujo.edu.ve' : log.usuario_correo;
          const bgGradient = esSistema 
            ? 'from-slate-700 to-slate-900 shadow-slate-700/20' 
            : 'from-indigo-500 to-indigo-700 shadow-indigo-500/20';

          return (
            <div key={log.id} className="bg-white p-5 rounded-2xl shadow-md border border-gray-100/70 space-y-4 hover:shadow-lg transition-all duration-300">
              {/* Encabezado: Operador/Sistema y Badge de Acción */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${bgGradient} flex items-center justify-center text-white text-xs font-black shadow-md`}>
                    {iniciales}
                  </div>
                  <div className="flex flex-col">
                    <span className={`font-semibold leading-none ${esSistema ? 'text-slate-500 font-extrabold tracking-wider text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-md w-fit' : 'text-gray-900 text-sm'}`}>
                      {nombreCompleto}
                    </span>
                    <span className="text-[9px] text-gray-400 mt-1 leading-none font-medium">
                      {correoCompleto}
                    </span>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border tracking-wider ${getBadgeStyle(log.accion)}`}>
                  {log.accion}
                </span>
              </div>

              {/* Fecha y Hora en Formato Premium */}
              <div className="text-[10px] text-gray-500 flex items-center space-x-1.5 font-semibold bg-gray-50 px-2.5 py-1.5 rounded-lg w-fit">
                <IconClock className="w-3.5 h-3.5 text-gray-400" />
                <span>
                  {new Date(log.fecha).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })} - {new Date(log.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>

              {/* Detalle y Efecto */}
              <div className="space-y-2">
                <p className="text-gray-700 font-medium text-xs leading-relaxed">
                  {descripcionAccion}
                </p>
                {efectoAccion && (
                  <div className="flex items-start gap-1 bg-indigo-50/40 p-2.5 rounded-xl border border-indigo-100/40">
                    <span className="text-indigo-500 mt-0.5"><IconChevronRight className="w-3.5 h-3.5 flex-shrink-0" /></span>
                    <span className="text-[10px] text-indigo-700 font-semibold leading-relaxed">
                      {efectoAccion}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredLogs.length === 0 && (
          <div className="bg-white p-12 rounded-2xl text-center text-gray-400 border border-gray-100">
            <IconClipboard className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="font-semibold text-gray-500">No se encontraron transacciones</p>
            <p className="text-xs text-gray-400 mt-1">Ajusta tus filtros o términos de búsqueda.</p>
          </div>
        )}
      </div>

      {/* Vista de Escritorio (Tabla Premium Rediseñada y Totalmente Fluida) */}
      <div className="hidden md:block bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <table className="w-full text-sm text-left border-collapse table-fixed">
            <thead className="bg-gray-50 text-gray-700 border-b border-gray-100 font-bold uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4 w-[160px]">🕒 Hora y Fecha</th>
                <th className="px-6 py-4 w-[240px]">👤 Operador / Usuario</th>
                <th className="px-6 py-4 w-[220px]">🏷️ Acción Realizada</th>
                <th className="px-6 py-4">📋 Detalle, Qué Afectó y Efecto en Sistema</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.map((log) => {
                const partes = log.detalles?.split('. ') || [];
                const descripcionAccion = partes[0] || '';
                const efectoAccion = partes.slice(1).join('. ') || '';

                return (
                  <tr key={log.id} className="hover:bg-indigo-50/20 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2.5">
                        <span className="p-1.5 bg-gray-100 rounded-lg text-gray-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                          <IconClock className="w-4 h-4" />
                        </span>
                        <div className="flex flex-col">
                          <span className="text-gray-800 font-semibold">
                            {new Date(log.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                          <span className="text-xs text-gray-400 font-medium">
                            {new Date(log.fecha).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      {(() => {
                        const esSistema = !log.usuario_nombre;
                        const iniciales = esSistema ? 'SYS' : getInitials(log.usuario_nombre, log.usuario_apellido);
                        const nombreCompleto = esSistema ? 'SISTEMA' : `${log.usuario_nombre} ${log.usuario_apellido}`;
                        const correoCompleto = esSistema ? 'sistema@iujo.edu.ve' : log.usuario_correo;
                        const bgGradient = esSistema 
                          ? 'from-slate-700 to-slate-900 shadow-slate-700/20' 
                          : 'from-indigo-500 to-indigo-700 shadow-indigo-500/20';

                        return (
                          <div className="flex items-center space-x-3">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${bgGradient} flex items-center justify-center text-white text-xs font-black shadow-md flex-shrink-0`}>
                              {iniciales}
                            </div>
                            <div className="flex flex-col">
                              <span className={`font-semibold leading-none ${esSistema ? 'text-slate-500 font-extrabold tracking-wider text-[11px] bg-slate-100 px-1.5 py-0.5 rounded-md w-fit' : 'text-gray-900'}`}>
                                {nombreCompleto}
                              </span>
                              <span className="text-[10px] text-gray-400 mt-1 leading-none font-medium">
                                {correoCompleto}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border tracking-wider break-all ${getBadgeStyle(log.accion)}`}>
                        {log.accion}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1.5 max-w-xl">
                        <p className="text-gray-700 font-medium text-xs leading-relaxed break-words">
                          {descripcionAccion}
                        </p>
                        {efectoAccion && (
                          <div className="flex items-start gap-1 bg-indigo-50/40 p-2.5 rounded-xl border border-indigo-100/40 w-fit">
                            <span className="text-indigo-500 mt-0.5 flex-shrink-0"><IconChevronRight className="w-3.5 h-3.5" /></span>
                            <span className="text-[11px] text-indigo-700 font-semibold leading-relaxed break-words">
                              {efectoAccion}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-400 bg-gray-50/50">
                    <IconClipboard className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="font-semibold text-gray-500">No se encontraron transacciones registradas</p>
                    <p className="text-xs text-gray-400 mt-1">Intenta ajustando tu término de búsqueda o filtros rápidos.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
      </div>
    </div>
  );
};

export default Bitacora;
