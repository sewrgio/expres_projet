import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login/Login';
import Register from './components/Register/Register';
import DashboardProfesor from './components/Dashboard/DashboardProfesor';
import DashboardCoordinador from './components/Dashboard/DashboardCoordinador';
import Layout from './components/Layout/Layout';
import EscanearQR from './components/Asistencias/EscanearQR';
import GenerarQR from './components/QR/GenerarQR';
import ListaProfesores from './components/Profesores/ListaProfesores';
import GestionCarreras from './components/Carreras/GestionCarreras';
import GestionAsignaturas from './components/Asignaturas/GestionAsignaturas';
import GestionHorarios from './components/Horarios/GestionHorarios';
import GestionJustificativos from './components/Justificativos/GestionJustificativos';
import AgregarCoordinador from './components/Coordinadores/AgregarCoordinador';
import ReporteAsistencia from './components/Reportes/ReporteAsistencia';
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
      
      <Route path="/" element={
        <ProtectedRoute>
          {user?.roles?.includes('auditor') ? 
            <Layout><DashboardCoordinador /></Layout> : 
           user?.roles?.includes('coordinador') ? 
            <Layout><DashboardCoordinador /></Layout> : 
            <Layout><DashboardProfesor /></Layout>
          }
        </ProtectedRoute>
      } />
      
      <Route path="/escanear" element={
        <ProtectedRoute roles={['profesor', 'coordinador', 'auditor']}>
          <Layout><EscanearQR /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/generar-qr" element={
        <ProtectedRoute roles={['coordinador']}>
          <Layout><GenerarQR /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/profesores" element={
        <ProtectedRoute roles={['coordinador']}>
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
        <ProtectedRoute roles={['coordinador']}>
          <Layout><GestionAsignaturas /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/horarios" element={
        <ProtectedRoute roles={['coordinador']}>
          <Layout><GestionHorarios /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/justificativos" element={
        <ProtectedRoute roles={['profesor', 'coordinador']}>
          <Layout><GestionJustificativos /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/reportes" element={
        <ProtectedRoute roles={['profesor', 'coordinador', 'auditor']}>
          <Layout><ReporteAsistencia /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/control-coordinadores" element={
        <ProtectedRoute roles={['auditor']}>
          <Layout><GestionJustificativos /></Layout> 
        </ProtectedRoute>
      } />
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