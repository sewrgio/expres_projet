import express from 'express';
import Asignatura from '../models/asignatura.js';
import auth from '../middleware/auth.js';
import pool from '../config/db.js';

const router = express.Router();

// ✅ Obtener todas las asignaturas (con profesor asignado)
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, c.nombre_carrera,
              p.id_profesor, u.nombre as profesor_nombre, u.apellido as profesor_apellido
       FROM asignatura a
       LEFT JOIN carrera c ON a.id_carrera = c.id_carrera
       LEFT JOIN asignatura_profesor ap ON a.id_asignatura = ap.id_asignatura AND ap.activo = true
       LEFT JOIN profesor p ON ap.id_profesor = p.id_profesor
       LEFT JOIN usuario_rol ur ON p.id_usuario_rol = ur.id_usuario_rol
       LEFT JOIN usuario u ON ur.id_usuario = u.id_usuario
       WHERE a.activo = true
       ORDER BY a.nombre_asignatura`
    );
    
    let asignaturas = result.rows;
    
    // Si es coordinador (y no auditor), filtrar por su carrera
    if (req.user.esCoordinador && !req.user.roles.includes('auditor') && req.user.ids_carreras && req.user.ids_carreras.length > 0) {
      asignaturas = asignaturas.filter(a => req.user.ids_carreras.includes(a.id_carrera));
    }
    
    res.json(asignaturas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ✅ Obtener asignaturas por carrera (PÚBLICO)
router.get('/carrera/:id', async (req, res) => {
  try {
    const asignaturas = await Asignatura.findByCarrera(req.params.id);
    res.json(asignaturas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ✅ NUEVO: Asignar profesor a asignatura (solo coordinador)
router.post('/asignar-profesor', auth, async (req, res) => {
  if (!req.user.esCoordinador) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  const { id_asignatura, id_profesor, fecha_desde } = req.body;

  if (!id_asignatura || !id_profesor) {
    return res.status(400).json({ error: 'Asignatura y profesor son requeridos' });
  }

  try {
    // Desactivar asignaciones anteriores
    await pool.query(
      `UPDATE asignatura_profesor SET activo = false WHERE id_asignatura = $1`,
      [id_asignatura]
    );
    
    // Crear nueva asignación
    const result = await pool.query(
      `INSERT INTO asignatura_profesor (id_asignatura, id_profesor, fecha_desde, activo)
       VALUES ($1, $2, COALESCE($3, CURRENT_DATE), true) RETURNING *`,
      [id_asignatura, id_profesor, fecha_desde]
    );
    
    res.status(201).json({ 
      success: true, 
      message: 'Profesor asignado correctamente',
      asignacion: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al asignar profesor' });
  }
});

// Crear asignatura (solo coordinador)
router.post('/', auth, async (req, res) => {
  if (!req.user.esCoordinador) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  const { nombre_asignatura, id_carrera } = req.body;
  if (!nombre_asignatura || !id_carrera) {
    return res.status(400).json({ error: 'Nombre y carrera son requeridos' });
  }

  try {
    const asignatura = await Asignatura.create(nombre_asignatura, id_carrera);
    res.status(201).json(asignatura);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Actualizar asignatura (solo coordinador)
router.put('/:id', auth, async (req, res) => {
  if (!req.user.esCoordinador) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  const { nombre_asignatura, id_carrera } = req.body;
  try {
    const asignatura = await Asignatura.update(req.params.id, nombre_asignatura, id_carrera);
    res.json(asignatura);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Eliminar asignatura (solo coordinador)
router.delete('/:id', auth, async (req, res) => {
  if (!req.user.esCoordinador) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  try {
    const asignatura = await Asignatura.delete(req.params.id);
    res.json({ success: true, message: 'Asignatura eliminada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;