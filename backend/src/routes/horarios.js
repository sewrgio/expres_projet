import express from 'express';
import Horario from '../models/horario.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Obtener todos los horarios (soporta alias /todos)
router.get(['/', '/todos'], auth, async (req, res) => {
  try {
    let horarios = await Horario.findAll();
    
    // Si es coordinador (y no auditor), filtrar por su carrera
    if (req.user.esCoordinador && !req.user.roles.includes('auditor') && req.user.ids_carreras && req.user.ids_carreras.length > 0) {
      horarios = horarios.filter(h => req.user.ids_carreras.includes(h.id_carrera));
    }
    
    res.json(horarios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Obtener horarios del profesor
router.get('/profesor', auth, async (req, res) => {
  if (!req.user.esProfesor) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  try {
    const horarios = await Horario.findByProfesor(req.user.id_profesor);
    res.json(horarios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Obtener asignaturas con profesores (para select)
router.get('/asignaturas-profesores', auth, async (req, res) => {
  if (!req.user.esCoordinador && !req.user.roles.includes('auditor')) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  try {
    let data = await Horario.getAsignaturasConProfesores();
    
    // Si es coordinador (y no auditor), filtrar por su carrera
    if (req.user.esCoordinador && !req.user.roles.includes('auditor') && req.user.ids_carreras && req.user.ids_carreras.length > 0) {
      data = data.filter(ap => req.user.ids_carreras.includes(ap.id_carrera));
    }
    
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Crear horario (solo coordinador)
router.post('/', auth, async (req, res) => {
  if (!req.user.esCoordinador) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  const { id_asignatura_profesor, dia_semana, hora_inicio, hora_fin, aula } = req.body;
  
  // Validar que no haya conflicto de horario
  const conflicto = await Horario.verificarConflicto(
    id_asignatura_profesor, 
    dia_semana, 
    hora_inicio, 
    hora_fin
  );
  
  if (conflicto.tieneConflicto) {
    return res.status(409).json({ 
      error: 'Conflicto de horario',
      mensaje: conflicto.mensaje,
      conflicto: true
    });
  }
  
  try {
    const horario = await Horario.create(id_asignatura_profesor, dia_semana, hora_inicio, hora_fin, aula);
    res.status(201).json(horario);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Eliminar horario
router.delete('/:id', auth, async (req, res) => {
  if (!req.user.esCoordinador) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  try {
    await Horario.delete(req.params.id);
    res.json({ success: true, message: 'Horario eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ✅ NUEVO: Asignar profesor a asignatura (solo coordinador)
router.post('/asignar-profesor', auth, async (req, res) => {
  if (!req.user.esCoordinador && !req.user.roles.includes('auditor')) {
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
    const maxRes = await pool.query('SELECT COALESCE(MAX(id_asignatura_profesor), 0) + 1 as next_id FROM asignatura_profesor');
    const nextId = maxRes.rows[0].next_id;

    const result = await pool.query(
      `INSERT INTO asignatura_profesor (id_asignatura_profesor, id_asignatura, id_profesor, fecha_desde, activo)
       VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), true) RETURNING *`,
      [nextId, id_asignatura, id_profesor, fecha_desde]
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

export default router;