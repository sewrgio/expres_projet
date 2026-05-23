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
import { iniciarMonitoreoServidor } from './src/utils/serverMonitor.js';

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
iniciarMonitoreoServidor();

// Sincronización de coordinadores y adjuntos


const inicializarDatosCoordinadores = async () => {
  try {
    console.log("[DB SEED] Iniciando sincronización de coordinadores...");
    
    // 1. Obtener coordinadores que no están en la tabla profesor
    const coordsSinProfesor = await pool.query(`
      SELECT c.id_coordinador, c.id_usuario_rol, u.nombre, u.apellido
      FROM coordinador c
      JOIN usuario_rol ur ON c.id_usuario_rol = ur.id_usuario_rol
      JOIN usuario u ON ur.id_usuario = u.id_usuario
      WHERE NOT EXISTS (
        SELECT 1 FROM profesor p2 WHERE p2.id_usuario_rol = c.id_usuario_rol
      )
    `);
    
    console.log(`[DB SEED] Encontrados ${coordsSinProfesor.rows.length} coordinadores sin registro de profesor.`);
    
    for (const c of coordsSinProfesor.rows) {
      const maxIdRes = await pool.query('SELECT COALESCE(MAX(id_profesor), 0) + 1 as next_id FROM profesor');
      const nextId = maxIdRes.rows[0].next_id;
      await pool.query(
        'INSERT INTO profesor (id_profesor, id_usuario_rol, fecha_ingreso, activo) VALUES ($1, $2, CURRENT_DATE, true)',
        [nextId, c.id_usuario_rol]
      );
      console.log(`[DB SEED] Creado profesor ID ${nextId} para coordinador ${c.nombre} ${c.apellido}`);
    }

    // 2. Asociar carrera si no la tienen en profesor_carrera
    const coordsSinCarrera = await pool.query(`
      SELECT p.id_profesor, c.id_carrera, u.nombre, u.apellido
      FROM coordinador c
      JOIN profesor p ON c.id_usuario_rol = p.id_usuario_rol
      JOIN usuario_rol ur ON c.id_usuario_rol = ur.id_usuario_rol
      JOIN usuario u ON ur.id_usuario = u.id_usuario
      WHERE NOT EXISTS (
        SELECT 1 FROM profesor_carrera pc WHERE pc.id_profesor = p.id_profesor
      )
    `);
    for (const cc of coordsSinCarrera.rows) {
      const maxIdPCRes = await pool.query('SELECT COALESCE(MAX(id_profesor_carrera), 0) + 1 as next_id FROM profesor_carrera');
      const nextIdPC = maxIdPCRes.rows[0].next_id;
      await pool.query(
        'INSERT INTO profesor_carrera (id_profesor_carrera, id_profesor, id_carrera, dedicacion, fecha_desde, activo) VALUES ($1, $2, $3, $4, CURRENT_DATE, true)',
        [nextIdPC, cc.id_profesor, cc.id_carrera || 1, 'tiempo completo']
      );
      console.log(`[DB SEED] Asignada carrera ${cc.id_carrera || 1} a profesor ID ${cc.id_profesor} (${cc.nombre})`);
    }

    // 3. Generar asistencias y justificativos si tienen menos de 20 asistencias
    const coordinadoresList = await pool.query(`
      SELECT p.id_profesor, u.nombre, u.apellido, c.id_carrera
      FROM coordinador c
      JOIN profesor p ON c.id_usuario_rol = p.id_usuario_rol
      JOIN usuario_rol ur ON c.id_usuario_rol = ur.id_usuario_rol
      JOIN usuario u ON ur.id_usuario = u.id_usuario
    `);

    for (const coord of coordinadoresList.rows) {
      const asisCountRes = await pool.query('SELECT COUNT(*) FROM asistencia WHERE id_profesor = $1', [coord.id_profesor]);
      const count = parseInt(asisCountRes.rows[0].count);
      
      if (count < 20) {
        console.log(`[DB SEED] Generando historial para ${coord.nombre} ${coord.apellido} (ID Profesor: ${coord.id_profesor})...`);
        
        // Generar desde hace 30 días
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        const endDate = new Date();
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          if (d.getDay() === 0 || d.getDay() === 6) continue; // omitir fin de semana
          
          const fechaStr = d.toISOString().split('T')[0];
          const maxIdAsisRes = await pool.query('SELECT COALESCE(MAX(id_asistencia), 0) + 1 as next_id FROM asistencia');
          const idAsistencia = maxIdAsisRes.rows[0].next_id;
          
          const randVal = Math.random();
          
          // 85% asistencia normal, 15% falta (sin salida)
          if (randVal < 0.85) {
            const minEntrada = Math.floor(Math.random() * 60).toString().padStart(2, '0');
            const entradaStr = `${fechaStr} 08:${minEntrada}:00`;
            const minSalida = Math.floor(Math.random() * 60).toString().padStart(2, '0');
            const salidaStr = `${fechaStr} 16:${minSalida}:00`;
            
            await pool.query(
              'INSERT INTO asistencia (id_asistencia, id_profesor, fecha_entrada, fecha_salida) VALUES ($1, $2, $3, $4)',
              [idAsistencia, coord.id_profesor, entradaStr, salidaStr]
            );
          } else {
            // Falta
            const minEntrada = Math.floor(Math.random() * 60).toString().padStart(2, '0');
            const entradaStr = `${fechaStr} 08:${minEntrada}:00`;
            
            await pool.query(
              'INSERT INTO asistencia (id_asistencia, id_profesor, fecha_entrada, fecha_salida) VALUES ($1, $2, $3, NULL)',
              [idAsistencia, coord.id_profesor, entradaStr]
            );
            
            // 60% la justifica
            if (Math.random() < 0.6) {
              const maxIdJustRes = await pool.query('SELECT COALESCE(MAX(id_justificativo), 0) + 1 as next_id FROM justificativo');
              const idJustificativo = maxIdJustRes.rows[0].next_id;
              
              const estados = ['aprobado', 'pendiente', 'rechazado'];
              const estado = estados[Math.floor(Math.random() * estados.length)];
              const motivos = ['Cita Médica', 'Asuntos de Coordinación externos', 'Problemas de salud', 'Trámites institucionales'];
              const motivo = motivos[Math.floor(Math.random() * motivos.length)];
              
              const dJustif = new Date(d);
              dJustif.setDate(dJustif.getDate() + 1);
              const fechaSoliStr = `${dJustif.toISOString().split('T')[0]} 10:00:00`;
              
              await pool.query(
                "INSERT INTO justificativo (id_justificativo, id_asistencia, estado, fecha_solicitud, motivo, documento_url) VALUES ($1, $2, $3, $4, $5, $6)",
                [idJustificativo, idAsistencia, estado, fechaSoliStr, motivo, '/uploads/justificativos/ejemplo.pdf']
              );
            }
          }
        }
        
        console.log(`[DB SEED] Historial completado para ${coord.nombre} ${coord.apellido}`);
      }
    }
    
    // Corregir secuencias
    try { await pool.query(`SELECT setval(pg_get_serial_sequence('profesor', 'id_profesor'), coalesce(max(id_profesor), 1), max(id_profesor) IS NOT null) FROM profesor`); } catch(e){}
    try { await pool.query(`SELECT setval(pg_get_serial_sequence('profesor_carrera', 'id_profesor_carrera'), coalesce(max(id_profesor_carrera), 1), max(id_profesor_carrera) IS NOT null) FROM profesor_carrera`); } catch(e){}
    try { await pool.query(`SELECT setval(pg_get_serial_sequence('asistencia', 'id_asistencia'), coalesce(max(id_asistencia), 1), max(id_asistencia) IS NOT null) FROM asistencia`); } catch(e){}
    try { await pool.query(`SELECT setval(pg_get_serial_sequence('justificativo', 'id_justificativo'), coalesce(max(id_justificativo), 1), max(id_justificativo) IS NOT null) FROM justificativo`); } catch(e){}
    
    console.log("[DB SEED] Sincronización de coordinadores completada con éxito.");
  } catch (err) {
    console.error("[DB SEED] Error al sincronizar coordinadores:", err);
  }
};
inicializarDatosCoordinadores();



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