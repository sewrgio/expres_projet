import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login/Login';
import Register from './components/Register/Register';
import DashboardProfesor from './components/Dashboard/DashboardProfesor';
import DashboardCoordinador from './components/Dashboard/DashboardCoordinador';
import Layout from './components/Layout/Layout';
import EscanearQR from './components/Asistencias/EscanearQR';
import AdministrarQR from './components/QR/AdministrarQR';
import ControlQRFijos from './components/QR/ControlQRFijos';
import ListaProfesores from './components/Profesores/ListaProfesores';
import GestionCarreras from './components/Carreras/GestionCarreras';
import GestionAsignaturasHorarios from './components/Asignaturas/GestionAsignaturasHorarios';
import GestionJustificativos from './components/Justificativos/GestionJustificativos';
import AgregarCoordinador from './components/Coordinadores/AgregarCoordinador';
import ControlCoordinadores from './components/Coordinadores/ControlCoordinadores';
import GestionRoles from './components/Usuarios/GestionRoles';
import ReporteAsistencia from './components/Reportes/ReporteAsistencia';
import VerifyEmail from './components/Auth/VerifyEmail';
import ForgotPassword from './components/Auth/ForgotPassword';
import RecoveryCode from './components/Auth/RecoveryCode';
import ResetPassword from './components/Auth/ResetPassword';
import ConfiguracionGeneral from './components/Configuracion/ConfiguracionGeneral';
import DetalleCategoria from './components/Configuracion/DetalleCategoria';
import Bitacora from './components/Reportes/Bitacora';
import JustificativosCoordinadores from './components/Justificativos/JustificativosCoordinadores';
import ReporteCoordinadores from './components/Reportes/ReporteCoordinadores';
import './styles/global.css';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>Cargando...</div>;
  }
  
  if (!user) return <Navigate to="/login" />;
  
  if (roles && !roles.some(role => user.roles?.includes(role))) {
    return <Navigate to="/" />;
  }
  
  return children;
};

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>Cargando aplicación...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/recovery-code" element={<RecoveryCode />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          {user?.roles?.includes('auditor') ? 
            <Layout><DashboardCoordinador /></Layout> : 
           (user?.roles?.includes('coordinador') || user?.roles?.includes('adjunto coordinacion')) ? 
            <Layout><DashboardCoordinador /></Layout> : 
            <Layout><DashboardProfesor /></Layout>
          }
        </ProtectedRoute>
      } />
      
      <Route path="/escanear" element={
        <ProtectedRoute roles={['profesor', 'coordinador', 'adjunto coordinacion']}>
          <Layout><EscanearQR /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/administrar-qr" element={
        <ProtectedRoute roles={['coordinador', 'adjunto coordinacion']}>
          <Layout><AdministrarQR /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/profesores" element={
        <ProtectedRoute roles={['coordinador', 'adjunto coordinacion']}>
          <Layout><ListaProfesores /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/agregar-coordinador" element={
        <ProtectedRoute roles={['auditor']}>
          <Layout><AgregarCoordinador /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/carreras" element={
        <ProtectedRoute roles={['auditor']}>
          <Layout><GestionCarreras /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/asignaturas" element={
        <ProtectedRoute roles={['coordinador', 'adjunto coordinacion']}>
          <Layout><GestionAsignaturasHorarios /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/horarios" element={
        <ProtectedRoute roles={['coordinador', 'adjunto coordinacion']}>
          <Layout><GestionAsignaturasHorarios /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/justificativos" element={
        <ProtectedRoute roles={['coordinador', 'adjunto coordinacion', 'profesor']}>
          <Layout><GestionJustificativos /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/justificativos-profesores" element={
        <ProtectedRoute roles={['coordinador', 'adjunto coordinacion']}>
          <Layout><GestionJustificativos esVistaProfesores={true} /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/reportes" element={
        <ProtectedRoute roles={['profesor', 'coordinador', 'adjunto coordinacion', 'auditor']}>
          <Layout><ReporteAsistencia /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/justificativos-coordinadores" element={
        <ProtectedRoute roles={['auditor']}>
          <Layout><JustificativosCoordinadores /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/reportes-coordinadores" element={
        <ProtectedRoute roles={['auditor']}>
          <Layout><ReporteCoordinadores /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/bitacora" element={
        <ProtectedRoute roles={['auditor']}>
          <Layout><Bitacora /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/control-coordinadores" element={
        <ProtectedRoute roles={['auditor']}>
          <Layout><ControlCoordinadores /></Layout>
        </ProtectedRoute>
      } />

        <Route path="/roles" element={
          <ProtectedRoute roles={['auditor']}>
            <Layout>
              <GestionRoles />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/configuracion" element={
          <ProtectedRoute roles={['auditor']}>
            <Layout>
              <ConfiguracionGeneral />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/configuracion/:id" element={
          <ProtectedRoute roles={['auditor']}>
            <Layout>
              <DetalleCategoria />
            </Layout>
          </ProtectedRoute>
        } />

      <Route path="/control-qr-fijos" element={
        <ProtectedRoute roles={['auditor']}>
          <Layout><ControlQRFijos /></Layout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;