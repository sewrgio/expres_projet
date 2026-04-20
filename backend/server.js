import 'dotenv/config'; // Esto carga las variables de entorno antes de procesar los demás imports
import express from 'express';
import cors from 'cors';

// Importar rutas
import authRoutes from './src/routes/auth.js';
import asistenciaRoutes from './src/routes/asistencias.js';
import profesorRoutes from './src/routes/profesores.js';
import carreraRoutes from './src/routes/carreras.js';
import qrRoutes from './src/routes/qr.js';
import asignaturaRoutes from './src/routes/asignaturas.js';
import horarioRoutes from './src/routes/horarios.js';
import justificativoRoutes from './src/routes/justificativos.js';
import coordinadorRoutes from './src/routes/coordinadores.js';
import { sendRecoveryCode } from './src/services/emailService.js';

const app = express();

// Middlewares base (se recomienda que vayan primero)
app.use(cors());
app.use(express.json());

// Middleware de logging (ahora puede acceder al req.body si lo necesitaras en un futuro)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Ruta de prueba / health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Ruta de diagnóstico SMTP (solo en desarrollo)
app.get('/api/test-email', async (req, res) => {
  try {
    await sendRecoveryCode(process.env.EMAIL_USER, '0000');
    res.json({ success: true, message: `Correo de prueba enviado a ${process.env.EMAIL_USER}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/asistencias', asistenciaRoutes);
app.use('/api/profesores', profesorRoutes);
app.use('/api/carreras', carreraRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/asignaturas', asignaturaRoutes);
app.use('/api/horarios', horarioRoutes);
app.use('/api/justificativos', justificativoRoutes);
app.use('/api/coordinadores', coordinadorRoutes);

// Manejo de rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// Manejo global de errores (500)
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor corriendo en http://0.0.0.0:${PORT}`);
  console.log(`📚 API disponible en /api`);
});