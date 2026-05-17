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
import ubicacionRoutes from './src/routes/ubicacion.js';
import geofencingRoutes from './src/routes/geofencing.js';
import usuarioRoutes from './src/routes/usuarios.js';
import categoriasRoutes from './src/routes/categorias.js';
import bitacoraRoutes from './src/routes/bitacora.js';
import { sendRecoveryCode } from './src/services/emailService.js';
import pool from './src/config/db.js';

const app = express();

// Inicializar tabla de bitácora
pool.query(`
  CREATE TABLE IF NOT EXISTS bitacora_logs (
    id SERIAL PRIMARY KEY,
    id_usuario INTEGER REFERENCES usuario(id_usuario),
    accion VARCHAR(255) NOT NULL,
    detalles TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`).catch(err => console.error("Error creando tabla bitacora_logs:", err));

// Asegurar que todos los roles requeridos existan en la tabla categoria (tip_id = 1)
const inicializarRoles = async () => {
  try {
    const rolesRequeridos = ['profesor', 'coordinador', 'adjunto coordinacion', 'auditor', 'tiempo completo', 'medio tiempo'];
    for (const rol of rolesRequeridos) {
      const res = await pool.query('SELECT * FROM categoria WHERE LOWER(nombre) = LOWER($1) AND tip_id = 1', [rol]);
      if (res.rows.length === 0) {
        const maxIdRes = await pool.query('SELECT COALESCE(MAX(id_categoria), 0) + 1 as next_id FROM categoria');
        const nextId = maxIdRes.rows[0].next_id;
        await pool.query(
          'INSERT INTO categoria (id_categoria, tip_id, nombre) VALUES ($1, 1, $2)',
          [nextId, rol]
        );
        console.log(`[DB] Rol '${rol}' insertado con éxito (ID: ${nextId})`);
      }
    }

    // Sincronizar automáticamente la dedicación de tiempo para usuarios existentes
    const usuariosRoles = await pool.query(`
      SELECT ur.id_usuario, json_agg(LOWER(c.nombre)) as roles
      FROM usuario_rol ur
      JOIN categoria c ON ur.id_categoria = c.id_categoria
      WHERE ur.activo = true AND c.tip_id = 1
      GROUP BY ur.id_usuario
    `);

    if (usuariosRoles.rows.length > 0) {
      console.log(`[DB] Verificando dedicación de tiempo para ${usuariosRoles.rows.length} usuarios...`);
      for (const u of usuariosRoles.rows) {
        const roles = Array.isArray(u.roles) ? u.roles : [];
        
        // Si ya tiene una dedicación asignada, omitir
        if (roles.includes('tiempo completo') || roles.includes('medio tiempo')) {
          continue;
        }

        let nuevoRol = null;
        if (roles.includes('coordinador') || roles.includes('adjunto coordinacion')) {
          nuevoRol = 'tiempo completo';
        } else if (roles.includes('profesor')) {
          nuevoRol = 'medio tiempo';
        }

        if (nuevoRol) {
          // Obtener ID del rol
          const rQuery = await pool.query('SELECT id_categoria FROM categoria WHERE LOWER(nombre) = $1 AND tip_id = 1 LIMIT 1', [nuevoRol.toLowerCase()]);
          if (rQuery.rows.length > 0) {
            const idRol = rQuery.rows[0].id_categoria;
            
            // Insertar o reactivar en usuario_rol
            const existRes = await pool.query(
              'SELECT id_usuario_rol FROM usuario_rol WHERE id_usuario = $1 AND id_categoria = $2',
              [u.id_usuario, idRol]
            );

            if (existRes.rows.length > 0) {
              await pool.query('UPDATE usuario_rol SET activo = true WHERE id_usuario_rol = $1', [existRes.rows[0].id_usuario_rol]);
            } else {
              const maxIdRes = await pool.query('SELECT COALESCE(MAX(id_usuario_rol), 0) + 1 as next_id FROM usuario_rol');
              const nextId = maxIdRes.rows[0].next_id;
              await pool.query(
                'INSERT INTO usuario_rol (id_usuario_rol, id_usuario, id_categoria, fecha_desde, activo) VALUES ($1, $2, $3, CURRENT_DATE, true)',
                [nextId, u.id_usuario, idRol]
              );
            }

            // Regenerar campo "rol" (jsonb) en tabla usuario
            await pool.query(`
              UPDATE usuario 
              SET rol = (
                SELECT COALESCE(jsonb_agg(LOWER(c.nombre)), '[]'::jsonb)
                FROM usuario_rol ur
                JOIN categoria c ON ur.id_categoria = c.id_categoria
                WHERE ur.id_usuario = $1 AND ur.activo = true AND c.tip_id = 1
              )
              WHERE id_usuario = $1
            `, [u.id_usuario]);
            
            console.log(`[DB] Usuario ID ${u.id_usuario} sincronizado automáticamente como '${nuevoRol}'`);
          }
        }
      }
    }
  } catch (err) {
    console.error("Error al inicializar roles en categoria:", err);
  }
};
inicializarRoles();

// Middlewares base (se recomienda que vayan primero)
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Middleware de logging (ahora puede acceder al req.body si lo necesitaras en un futuro)
app.use(async (req, res, next) => {
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
app.use('/api/ubicacion', ubicacionRoutes);
app.use('/api/geofencing', geofencingRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/bitacora', bitacoraRoutes);

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