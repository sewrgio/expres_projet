import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { IconEdit, IconUser, IconLock, IconEye, IconEyeOff, IconMail, IconPhone, IconGraduation } from '../Icons/SystemIcons';
import CustomSelect from '../UI/CustomSelect';
import '../../styles/Login.css';

const PREFIJOS_VENEZUELA = ['0412', '0414', '0424', '0416', '0426'];

const Register = () => {
  const navigate = useNavigate();
  const [carreras, setCarreras] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    cedula: '',
    carrera_id: '',
    correo: '',
    prefijo: '0412',
    numero_tlf: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const fetchCarreras = async () => {
      try {
        const res = await api.get('/carreras');
        setCarreras(res.data.filter(c => c.activo));
      } catch (err) {
        console.error('Error al cargar carreras:', err);
      }
    };

    fetchCarreras();
    const interval = setInterval(fetchCarreras, 30000); // Actualizar cada 30 segundos

    return () => clearInterval(interval);
  }, []);

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email) && email.toLowerCase().endsWith('@iujo.edu.ve');
  };

  const handleChange = (e) => {
    let value = e.target.value;
    const name = e.target.name;

    if (name === 'nombre' || name === 'apellido') {
      value = value.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ\s]/g, '');
    }
    
    if (name === 'cedula') {
      value = value.replace(/[^0-9]/g, '').substring(0, 10);
    }

    if (name === 'numero_tlf') {
      value = value.replace(/[^0-9]/g, '').substring(0, 7);
    }

    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.carrera_id) {
      setError('Debe seleccionar una carrera');
      return;
    }
    if (!validateEmail(formData.correo)) {
      setError('Debe usar un correo institucional válido (@iujo.edu.ve)');
      return;
    }
    if (formData.numero_tlf.length < 7) {
      setError('El número de teléfono debe tener 7 dígitos');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/register', {
        nombre: formData.nombre,
        apellido: formData.apellido,
        cedula: formData.cedula,
        carrera_id: formData.carrera_id,
        correo: formData.correo,
        telefono: `${formData.prefijo}${formData.numero_tlf}`,
        password: formData.password
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a237e] to-[#283593] p-4 sm:p-8 selection:bg-indigo-200">
        <div className="w-full max-w-[360px] sm:max-w-md 2xl:max-w-lg bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-2xl p-8 sm:p-12 2xl:p-16 border border-white/20 animate-fade-in-up text-center">
          <div className="w-20 h-20 2xl:w-24 2xl:h-24 bg-green-100 rounded-full flex items-center justify-center text-green-500 text-4xl 2xl:text-5xl mx-auto mb-6 shadow-inner">
            <IconMail />
          </div>
          <h2 className="text-2xl sm:text-3xl 2xl:text-4xl font-bold text-slate-800 mb-4 tracking-tight">¡Registro casi listo!</h2>
          <p className="text-slate-600 text-sm sm:text-base 2xl:text-lg mb-2 leading-relaxed">
            Hemos enviado un correo de confirmación a <strong className="text-slate-800 break-all">{formData.correo}</strong>.
          </p>
          <p className="text-slate-500 text-xs sm:text-sm 2xl:text-base mb-8">
            Por favor, verifica tu bandeja de entrada o spam para activar tu cuenta.
          </p>
          <button 
            onClick={() => navigate('/login')} 
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3.5 sm:py-4 2xl:py-5 rounded-xl shadow-[0_8px_20px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 transition-all duration-300 text-sm sm:text-base 2xl:text-lg uppercase tracking-wide"
          >
            VOLVER AL LOGIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a237e] to-[#283593] p-2 sm:p-8 selection:bg-indigo-200">
      <div className="w-full max-w-[360px] sm:max-w-xl 2xl:max-w-2xl bg-white/95 backdrop-blur-md rounded-xl sm:rounded-3xl shadow-2xl p-5 sm:p-10 2xl:p-14 border border-white/20 animate-fade-in-up">
        
        <div className="text-center mb-6 sm:mb-10 2xl:mb-12">
          <div className="w-12 h-12 sm:w-16 sm:h-16 2xl:w-20 2xl:h-20 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-2xl sm:text-3xl 2xl:text-4xl mx-auto mb-3 sm:mb-4">
            <IconEdit />
          </div>
          <h2 className="text-lg sm:text-2xl 2xl:text-3xl font-bold text-slate-800 tracking-tight leading-tight px-1 sm:px-2">
            Registro de Profesor
          </h2>
          <div className="w-12 sm:w-16 h-1 bg-amber-500 mx-auto mt-3 sm:mt-4 rounded-full"></div>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5 2xl:gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div className="relative group">
              <input type="text" name="nombre" placeholder="Nombre" value={formData.nombre} onChange={handleChange} required 
                className="w-full px-4 py-3 sm:py-3.5 2xl:py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-700 text-sm sm:text-base 2xl:text-lg placeholder:text-slate-400" />
            </div>
            <div className="relative group">
              <input type="text" name="apellido" placeholder="Apellido" value={formData.apellido} onChange={handleChange} required 
                className="w-full px-4 py-3 sm:py-3.5 2xl:py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-700 text-sm sm:text-base 2xl:text-lg placeholder:text-slate-400" />
            </div>
          </div>

          <div className="relative group">
            <input type="text" name="cedula" placeholder="Cédula" value={formData.cedula} onChange={handleChange} required 
              className="w-full px-4 py-3 sm:py-3.5 2xl:py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-700 text-sm sm:text-base 2xl:text-lg placeholder:text-slate-400" />
          </div>

          <div className="relative group">
            <CustomSelect 
              name="carrera_id" 
              value={formData.carrera_id} 
              onChange={(val) => setFormData({...formData, carrera_id: val})} 
              required 
              options={carreras.map(c => ({ value: c.id_carrera, label: c.nombre_carrera }))}
              placeholder="Seleccione su Carrera"
            />
          </div>

          <div className="relative group">
            <input type="email" name="correo" placeholder="Correo institucional (@iujo.edu.ve)" value={formData.correo} onChange={handleChange} required 
              className="w-full px-4 py-3 sm:py-3.5 2xl:py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-700 text-sm sm:text-base 2xl:text-lg placeholder:text-slate-400" />
          </div>

          <div className="flex gap-3 sm:gap-4">
            <div className="relative group w-32 sm:w-36 z-10">
              <CustomSelect 
                name="prefijo" 
                value={formData.prefijo} 
                onChange={(val) => setFormData({...formData, prefijo: val})} 
                options={PREFIJOS_VENEZUELA.map(p => ({ value: p, label: p }))}
                placeholder="Prefijo"
              />
            </div>
            <div className="relative group flex-1">
              <input 
                type="tel" 
                name="numero_tlf" 
                placeholder="Número (7 dígitos)" 
                value={formData.numero_tlf} 
                onChange={handleChange} 
                required 
                className="w-full px-4 py-3 sm:py-3.5 2xl:py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-700 text-sm sm:text-base 2xl:text-lg placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div className="relative group">
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" 
                placeholder="Contraseña" 
                value={formData.password} 
                onChange={handleChange} 
                required 
                className="w-full pl-4 pr-12 py-3 sm:py-3.5 2xl:py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-700 text-sm sm:text-base 2xl:text-lg placeholder:text-slate-400"
              />
              <button 
                type="button" 
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none text-lg"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
            <div className="relative group">
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                name="confirmPassword" 
                placeholder="Confirmar" 
                value={formData.confirmPassword} 
                onChange={handleChange} 
                required 
                className="w-full pl-4 pr-12 py-3 sm:py-3.5 2xl:py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-700 text-sm sm:text-base 2xl:text-lg placeholder:text-slate-400"
              />
              <button 
                type="button" 
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none text-lg"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex="-1"
              >
                {showConfirmPassword ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
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
            {loading ? 'REGISTRANDO...' : 'CREAR CUENTA'}
          </button>
        </form>
        
        <div className="mt-6 sm:mt-8 2xl:mt-10 pt-6 border-t border-slate-100 text-center text-xs sm:text-sm 2xl:text-base">
           <span className="text-slate-500">¿Ya tienes cuenta? </span>
           <Link to="/login" className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline transition-all ml-1">Inicia sesión</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;