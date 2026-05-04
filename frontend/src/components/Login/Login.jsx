import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { IconUser, IconLock, IconEye, IconEyeOff } from '../Icons/SystemIcons';
import '../../styles/Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Todos los campos son obligatorios');
      return;
    }

    if (!validateEmail(username)) {
      setError('Correo electrónico inválido');
      return;
    }

    setLoading(true);
    try {
      await login(username, password, rememberMe);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a237e] to-[#283593] p-2 sm:p-8 selection:bg-indigo-200">
      <div className="w-full max-w-[360px] sm:max-w-md 2xl:max-w-lg bg-white/95 backdrop-blur-md rounded-xl sm:rounded-3xl shadow-2xl p-5 sm:p-10 2xl:p-14 border border-white/20 animate-fade-in-up">
        
        <div className="text-center mb-6 sm:mb-10 2xl:mb-12">
          <h3 className="text-base sm:text-xl 2xl:text-2xl font-bold text-slate-800 tracking-tight leading-tight px-1 sm:px-2">
            IUJO - Sistema de Control de Asistencias
          </h3>
          <div className="w-12 sm:w-16 h-1 bg-indigo-500 mx-auto mt-3 sm:mt-4 rounded-full"></div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5 2xl:gap-6">
          <div className="relative group">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors text-lg sm:text-xl 2xl:text-2xl">
              <IconUser />
            </span>
            <input
              type="text"
              placeholder="Correo electrónico"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full pl-12 pr-4 py-3 sm:py-3.5 2xl:py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-700 text-sm sm:text-base 2xl:text-lg placeholder:text-slate-400"
            />
          </div>

          <div className="relative group">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors text-lg sm:text-xl 2xl:text-2xl">
              <IconLock />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-12 pr-12 py-3 sm:py-3.5 2xl:py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-700 text-sm sm:text-base 2xl:text-lg placeholder:text-slate-400"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none text-lg sm:text-xl 2xl:text-2xl"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
            >
              {showPassword ? <IconEyeOff /> : <IconEye />}
            </button>
          </div>

          <div className="flex flex-row items-center justify-between mt-1 mb-2 text-xs sm:text-sm 2xl:text-base">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-800 transition-colors select-none">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="peer appearance-none w-4 h-4 sm:w-5 sm:h-5 border-2 border-slate-300 rounded focus:ring-2 focus:ring-indigo-500/20 checked:bg-indigo-600 checked:border-indigo-600 transition-all cursor-pointer"
                />
                <svg className="absolute w-3 h-3 sm:w-4 sm:h-4 text-white left-0.5 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 14 10" fill="none">
                  <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              Recuérdame
            </label>
            <Link to="/forgot-password" className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-all">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 sm:p-4 rounded-xl text-xs sm:text-sm 2xl:text-base font-medium flex items-start gap-2 border border-red-100 animate-shake">
              <span className="text-red-500 mt-0.5">⚠️</span>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-bold py-3.5 sm:py-4 2xl:py-5 rounded-xl shadow-[0_8px_20px_rgba(79,70,229,0.3)] hover:shadow-[0_8px_25px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed mt-2 text-sm sm:text-base 2xl:text-lg uppercase tracking-wide"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Cargando...</span>
              </div>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        <div className="mt-8 sm:mt-10 2xl:mt-12 pt-6 sm:pt-8 border-t border-slate-100 text-center">
          <Link to="/register" className="inline-block px-6 py-2 rounded-full text-xs sm:text-sm 2xl:text-base font-bold text-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-all uppercase tracking-wider">
            Crear cuenta
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;