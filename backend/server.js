import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get('/api/test', (req, res) => {
  res.json({ message: 'API funcionando correctamente' });
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

const PORT = process.env.PORT || 5000;
// 🔥 CAMBIO IMPORTANTE: Escuchar en todas las interfaces (0.0.0.0)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor corriendo en http://0.0.0.0:${PORT}`);
  console.log(`📚 API endpoints disponibles:`);
  console.log(`   - POST /api/auth/login`);
  console.log(`   - GET  /api/profesores`);
  console.log(`   - GET  /api/carreras`);
  console.log(`   - POST /api/qr/generar`);
  console.log(`   - POST /api/asistencias/escanear`);
  console.log(`   - GET  /api/asignaturas`);
  console.log(`   - GET  /api/horarios`);
  console.log(`   - GET  /api/justificativos`);
  console.log(`   - GET  /api/coordinadores`);
});