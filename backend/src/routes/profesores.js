import express from 'express';
import Profesor from '../models/profesor.js';
import auth from '../middleware/auth.js';
import pool from '../config/db.js';

const router = express.Router();

// Obtener todos los profesores (filtrado por carrera si es coordinador)
router.get('/', auth, async (req, res) => {
  if (!req.user.esCoordinador && !req.user.roles.includes('auditor')) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  
  try {
    let query = `
      SELECT DISTINCT ON (p.id_profesor) 
             p.id_profesor, u.nombre, u.apellido, u.correo, u.cedula, u.telefono,
             c.id_carrera, c.nombre_carrera
      FROM profesor p
      JOIN usuario_rol ur ON p.id_usuario_rol = ur.id_usuario_rol
      JOIN usuario u ON ur.id_usuario = u.id_usuario
      LEFT JOIN profesor_carrera pc ON p.id_profesor = pc.id_profesor AND pc.activo = true
      LEFT JOIN carrera c ON pc.id_carrera = c.id_carrera
      WHERE u.activo = true
    `;
    const params = [];

    // Filtro de seguridad para coordinadores
    if (req.user.esCoordinador && !req.user.roles.includes('auditor')) {
      console.log('DEBUG - Usuario:', req.user.nombre, '| Carreras:', req.user.ids_carreras);
      if (req.user.ids_carreras && req.user.ids_carreras.length > 0) {
        query += ` AND c.id_carrera = ANY($${params.length + 1}::int[])`;
        params.push(req.user.ids_carreras);
      } else {
        query += ` AND 1=0`;
      }
    }

    query += ` ORDER BY p.id_profesor, u.nombre`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ✅ NUEVO: Obtener todos los profesores (para asignar a asignaturas o justificativos)
router.get('/todos', auth, async (req, res) => {
  if (!req.user.esCoordinador && !req.user.roles.includes('auditor')) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  try {
    let query = `
      SELECT p.id_profesor, u.nombre, u.apellido, u.correo
      FROM profesor p
      JOIN usuario_rol ur ON p.id_usuario_rol = ur.id_usuario_rol
      JOIN usuario u ON ur.id_usuario = u.id_usuario
      WHERE u.activo = true
    `;
    const params = [];

    // Si es coordinador (y no auditor), filtrar por su carrera
    if (req.user.esCoordinador && !req.user.roles.includes('auditor') && req.user.ids_carreras.length > 0) {
      query += ` AND EXISTS (
        SELECT 1 FROM profesor_carrera pc
        WHERE pc.id_profesor = p.id_profesor AND pc.id_carrera = ANY($1) AND pc.activo = true
      )`;
      params.push(req.user.ids_carreras);
    }

    query += ` ORDER BY u.nombre`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ✅ NUEVO: Buscar profesores por término (nombre, apellido, cédula)
router.get('/buscar', auth, async (req, res) => {
  if (!req.user.esCoordinador && !req.user.roles.includes('auditor')) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  const { q } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Ingrese al menos 2 caracteres para buscar' });
  }

  try {
    let query = `
      SELECT p.id_profesor, u.nombre, u.apellido, u.correo, u.cedula,
             c.id_carrera, c.nombre_carrera
      FROM profesor p
      JOIN usuario_rol ur ON p.id_usuario_rol = ur.id_usuario_rol
      JOIN usuario u ON ur.id_usuario = u.id_usuario
      LEFT JOIN profesor_carrera pc ON p.id_profesor = pc.id_profesor AND pc.activo = true
      LEFT JOIN carrera c ON pc.id_carrera = c.id_carrera
      WHERE u.activo = true
      AND (
        u.nombre ILIKE $1 OR
        u.apellido ILIKE $1 OR
        u.cedula ILIKE $1 OR
        u.correo ILIKE $1
      )
    `;
    const params = [`%${q}%`];

    // Si es coordinador (y no auditor), filtrar por su carrera
    if (req.user.esCoordinador && !req.user.roles.includes('auditor') && req.user.ids_carreras && req.user.ids_carreras.length > 0) {
      query += ` AND c.id_carrera = ANY($2::int[])`;
      params.push(req.user.ids_carreras);
    }

    query += ` ORDER BY u.nombre, u.apellido LIMIT 10`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const profesor = await Profesor.findById(req.params.id);
    if (!profesor) {
      return res.status(404).json({ error: 'Profesor no encontrado' });
    }
    res.json(profesor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Actualizar todos los datos de un profesor
router.put('/:id', auth, async (req, res) => {
  if (!req.user.esCoordinador) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  const { id } = req.params;
  const { nombre, apellido, correo, cedula, telefono, id_carrera } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Obtener el id_usuario asociado al profesor
    const userRes = await client.query(`
      SELECT ur.id_usuario 
      FROM profesor p
      JOIN usuario_rol ur ON p.id_usuario_rol = ur.id_usuario_rol
      WHERE p.id_profesor = $1
    `, [id]);

    if (userRes.rows.length === 0) {
      throw new Error('Profesor no encontrado');
    }

    const idUsuario = userRes.rows[0].id_usuario;

    // 2. Actualizar datos en tabla usuario
    await client.query(`
      UPDATE usuario 
      SET nombre = $1, apellido = $2, correo = $3, cedula = $4, telefono = $5
      WHERE id_usuario = $6
    `, [nombre, apellido, correo, cedula, telefono || '', idUsuario]);

    // 3. Actualizar carrera en profesor_carrera
    if (id_carrera) {
      const pcRes = await client.query(`
        SELECT * FROM profesor_carrera WHERE id_profesor = $1 AND activo = true
      `, [id]);

      if (pcRes.rows.length > 0) {
        await client.query(`
          UPDATE profesor_carrera SET id_carrera = $1 WHERE id_profesor = $2 AND activo = true
        `, [id_carrera, id]);
      } else {
        const maxIdRes = await client.query('SELECT COALESCE(MAX(id_profesor_carrera), 0) + 1 as next_id FROM profesor_carrera');
        const nextId = maxIdRes.rows[0].next_id;

        await client.query(`
          INSERT INTO profesor_carrera (id_profesor_carrera, id_profesor, id_carrera, dedicacion, fecha_desde, activo)
          VALUES ($1, $2, $3, 'TIEMPO_COMPLETO', CURRENT_DATE, true)
        `, [nextId, id, id_carrera]);
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Datos del profesor actualizados correctamente' });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error editando profesor:', error);
    res.status(500).json({ error: 'Error al actualizar profesor' });
  } finally {
    client.release();
  }
});

export default router;