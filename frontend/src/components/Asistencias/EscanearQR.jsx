import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { IconQrcode, IconAlert, IconInfo } from '../Icons/SystemIcons';

const EscanearQR = () => {
  const { user } = useAuth();
  const [qrData, setQrData] = useState(null); // { codigo, imagen }
  const [cargandoQR, setCargandoQR] = useState(false);
  const [error, setError] = useState('');
  const [enArea, setEnArea] = useState(false);
  const [distancia, setDistancia] = useState(null);

  // Obtener ubicación desde el APK o web (almacenada en el backend)
  const obtenerUbicacionDesdeAPK = useCallback(async () => {
    try {
      const response = await api.get('/geofencing/ubicacion');
      if (response.data.success && response.data.ubicacion) {
        setDistancia(response.data.distancia);
        setEnArea(response.data.enArea);
      } else {
        setDistancia(null);
        setEnArea(false);
        // Si no hay ubicación, intentamos obtenerla del navegador
        intentarUbicacionNavegador();
      }
    } catch (error) {
      console.error('Error obteniendo ubicación desde APK:', error);
      setDistancia(null);
      setEnArea(false);
    }
  }, []);

  const intentarUbicacionNavegador = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            await api.post('/geofencing/ubicacion', {
              latitud: position.coords.latitude,
              longitud: position.coords.longitude,
              precision: position.coords.accuracy
            });
            // Reconsultar después de actualizar
            const response = await api.get('/geofencing/ubicacion');
            if (response.data.success && response.data.ubicacion) {
              setDistancia(response.data.distancia);
              setEnArea(response.data.enArea);
            }
          } catch (err) {
            console.error('Error enviando ubicación del navegador:', err);
          }
        },
        (error) => {
          console.error('Error de geolocalización del navegador:', error);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
  };

  useEffect(() => {
    if (user) {
      cargarMiQR();
    }
    obtenerUbicacionDesdeAPK();
    const interval = setInterval(obtenerUbicacionDesdeAPK, 5000); // Polling cada 5 segundos
    
    // Calcular tiempo restante hasta la próxima medianoche para refrescar el QR automáticamente
    const now = new Date();
    const millisTillMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1, 0) - now;
    const midnightTimeout = setTimeout(() => {
      if (user) cargarMiQR();
    }, millisTillMidnight);

    return () => {
      clearInterval(interval);
      clearTimeout(midnightTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obtenerUbicacionDesdeAPK, user]);

  const cargarMiQR = async () => {
    if (!user) return;

    setCargandoQR(true);
    setError('');

    try {
      const response = await api.get('/qr/mi-qr');
      setQrData({
        codigo: response.data.codigo,
        imagen: response.data.imagen, // imagen base64 generada por el backend
      });
    } catch (err) {
      console.error('Error cargando QR:', err);
      setError('No se pudo cargar el código QR. Intenta de nuevo.');
    } finally {
      setCargandoQR(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header Premium */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
            <IconQrcode />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Mi Código QR</h1>
            <p className="text-slate-500 font-medium tracking-tight">Código QR personal para el registro de asistencia</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col items-center p-8 sm:p-12 text-center relative">
        {cargandoQR ? (
          <div className="flex flex-col items-center justify-center p-20 text-indigo-600 w-full">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="font-medium animate-pulse">Cargando tu código QR...</p>
          </div>
        ) : (!user?.roles?.includes('profesor') && !user?.roles?.includes('coordinador')) ? (
          <div className="p-10 flex flex-col items-center w-full">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-4 border-4 border-white shadow-inner">
               <IconInfo />
            </div>
            <p className="text-slate-500 font-medium max-w-md mx-auto">
              Tu cuenta no tiene registros de asistencia asignados.
            </p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 px-6 py-4 rounded-2xl flex flex-col items-center gap-4 animate-shake max-w-md mx-auto w-full">
            <div className="flex items-center gap-3">
              <IconAlert /> <span className="font-medium">{error}</span>
            </div>
            <button 
              className="px-6 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all shadow-sm"
              onClick={cargarMiQR}
            >
              🔄 Reintentar
            </button>
          </div>
        ) : qrData ? (
          <div className="flex flex-col items-center w-full max-w-md mx-auto">
            
            <div className={`relative bg-white p-6 sm:p-8 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-slate-100 transition-all duration-500 ${enArea ? 'scale-100 opacity-100' : 'scale-95 opacity-50 grayscale'}`}>
              <img
                src={qrData.imagen}
                alt="Mi código QR"
                className="w-48 h-48 sm:w-64 sm:h-64 object-contain"
              />
              {!enArea && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[2px] rounded-[32px]">
                   <span className="bg-rose-500 text-white px-4 py-2 rounded-xl font-bold shadow-lg text-sm rotate-[-12deg]">Inactivo - Fuera del área</span>
                </div>
              )}
            </div>

            {!enArea && (
              <div className="mt-8 bg-amber-50 border border-amber-100 text-amber-700 px-6 py-4 rounded-2xl flex items-start gap-3 w-full text-left">
                <IconAlert className="flex-shrink-0 mt-0.5" /> 
                <span className="font-medium text-sm leading-relaxed">
                  No estás dentro del área del IUJO. Acércate a las instalaciones para que tu QR se active automáticamente y pueda ser escaneado.
                </span>
              </div>
            )}

            <div className="mt-8 w-full bg-indigo-50/50 border border-indigo-100/50 p-6 rounded-2xl text-left">
              <div className="flex items-center gap-2 mb-4 text-indigo-700">
                <IconInfo />
                <h4 className="font-bold">Información de Seguridad</h4>
              </div>
              <ul className="space-y-3 text-sm text-slate-600 font-medium">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>Este código QR es <strong className="text-slate-800">personal e intransferible</strong> para tu registro de asistencia.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>Por seguridad, <strong className="text-slate-800">no compartas ni captures</strong> este código con otras personas.</span>
                </li>
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default EscanearQR;