import express from 'express';
import Profesor from '../models/profesor.js';
import auth from '../middleware/auth.js';
import pool from '../config/db.js';

const router = express.Router();

// Obtener todos los profesores (con su carrera)
router.get('/', auth, async (req, res) => {
  if (!req.user.esCoordinador) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  
  try {
    const result = await pool.query(
      `SELECT p.id_profesor, u.nombre, u.apellido, u.correo, u.cedula, u.telefono,
              c.id_carrera, c.nombre_carrera
       FROM profesor p
       JOIN usuario_rol ur ON p.id_usuario_rol = ur.id_usuario_rol
       JOIN usuario u ON ur.id_usuario = u.id_usuario
       LEFT JOIN profesor_carrera pc ON p.id_profesor = pc.id_profesor AND pc.activo = true
       LEFT JOIN carrera c ON pc.id_carrera = c.id_carrera
       WHERE u.activo = true
       ORDER BY u.nombre`
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ✅ NUEVO: Obtener todos los profesores (para asignar a asignaturas o justificativos)
router.get('/todos', auth, async (req, res) => {
  if (!req.user.esCoordinador && req.user.rol !== 'auditor') {
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
    if (req.user.esCoordinador && req.user.rol !== 'auditor' && req.user.id_carrera) {
      query += ` AND EXISTS (
        SELECT 1 FROM profesor_carrera pc 
        WHERE pc.id_profesor = p.id_profesor AND pc.id_carrera = $1 AND pc.activo = true
      )`;
      params.push(req.user.id_carrera);
    }

    query += ` ORDER BY u.nombre`;
    
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

// Actualizar carrera de un profesor
router.put('/:id/carrera', auth, async (req, res) => {
  if (!req.user.esCoordinador) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  const { id } = req.params;
  const { carrera_id } = req.body;

  if (!carrera_id) {
    return res.status(400).json({ error: 'Carrera requerida' });
  }

  try {
    const existente = await pool.query(
      `SELECT * FROM profesor_carrera WHERE id_profesor = $1 AND activo = true`,
      [id]
    );

    if (existente.rows.length > 0) {
      await pool.query(
        `UPDATE profesor_carrera SET id_carrera = $1 WHERE id_profesor = $2 AND activo = true`,
        [carrera_id, id]
      );
    } else {
      await pool.query(
        `INSERT INTO profesor_carrera (id_profesor, id_carrera, dedicacion, fecha_desde, activo)
         VALUES ($1, $2, 'TIEMPO_COMPLETO', CURRENT_DATE, true)`,
        [id, carrera_id]
      );
    }

    res.json({ success: true, message: 'Carrera actualizada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar carrera' });
  }
});

export default router;