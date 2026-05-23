import express from 'express';
import Horario from '../models/horario.js';
import auth from '../middleware/auth.js';
import { registrarBitacora } from '../utils/bitacora.js';
import pool from '../config/db.js';

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
      data = data.filter(ap => req.user.ids_carreras.map(Number).includes(Number(ap.id_carrera)));
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

  // Validar permisos del coordinador sobre la carrera de la asignatura
  if (req.user.esCoordinador && !req.user.roles.includes('auditor')) {
    try {
      const apRes = await pool.query(
        `SELECT a.id_carrera 
         FROM asignatura_profesor ap
         JOIN asignatura a ON ap.id_asignatura = a.id_asignatura
         WHERE ap.id_asignatura_profesor = $1`,
        [id_asignatura_profesor]
      );
      if (apRes.rows.length > 0) {
        const idCarrera = apRes.rows[0].id_carrera;
        if (!req.user.ids_carreras || !req.user.ids_carreras.map(Number).includes(Number(idCarrera))) {
          return res.status(403).json({ error: 'No tienes permiso para gestionar horarios de esta carrera' });
        }
      } else {
        return res.status(400).json({ error: 'Asignación de profesor no encontrada' });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error de validación de permisos' });
    }
  }
  
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

    await registrarBitacora(
      req.user.id,
      'CREAR_HORARIO',
      `El coordinador ${req.user.correo} creó un bloque de horario (Asignatura-Profesor ID: ${id_asignatura_profesor}) para el día ${dia_semana} de ${hora_inicio} a ${hora_fin} en el aula ${aula}.`
    );

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
  
  // Validar permisos del coordinador sobre la carrera de la asignatura del horario
  if (req.user.esCoordinador && !req.user.roles.includes('auditor')) {
    try {
      const hRes = await pool.query(
        `SELECT a.id_carrera 
         FROM horario h
         JOIN asignatura_profesor ap ON h.id_asignatura_profesor = ap.id_asignatura_profesor
         JOIN asignatura a ON ap.id_asignatura = a.id_asignatura
         WHERE h.id_horario = $1`,
        [req.params.id]
      );
      if (hRes.rows.length > 0) {
        const idCarrera = hRes.rows[0].id_carrera;
        if (!req.user.ids_carreras || !req.user.ids_carreras.map(Number).includes(Number(idCarrera))) {
          return res.status(403).json({ error: 'No tienes permiso para eliminar horarios de esta carrera' });
        }
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error de validación de permisos' });
    }
  }

  try {
    await Horario.delete(req.params.id);

    await registrarBitacora(
      req.user.id,
      'ELIMINAR_HORARIO',
      `El coordinador ${req.user.correo} eliminó el bloque de horario con ID: ${req.params.id}.`
    );

    res.json({ success: true, message: 'Horario eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ✅ NUEVO: Actualizar horario (solo coordinador)
router.put('/:id', auth, async (req, res) => {
  if (!req.user.esCoordinador) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  const { id_asignatura_profesor, dia_semana, hora_inicio, hora_fin, aula } = req.body;
  const id_horario = req.params.id;

  // Validar permisos del coordinador sobre la carrera de la asignatura
  if (req.user.esCoordinador && !req.user.roles.includes('auditor')) {
    try {
      const apRes = await pool.query(
        `SELECT a.id_carrera 
         FROM asignatura_profesor ap
         JOIN asignatura a ON ap.id_asignatura = a.id_asignatura
         WHERE ap.id_asignatura_profesor = $1`,
        [id_asignatura_profesor]
      );
      if (apRes.rows.length > 0) {
        const idCarrera = apRes.rows[0].id_carrera;
        if (!req.user.ids_carreras || !req.user.ids_carreras.map(Number).includes(Number(idCarrera))) {
          return res.status(403).json({ error: 'No tienes permiso para gestionar horarios de esta carrera' });
        }
      } else {
        return res.status(400).json({ error: 'Asignación de profesor no encontrada' });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error de validación de permisos' });
    }
  }
  
  // Validar conflicto de horario (excluyendo el horario actual)
  const conflicto = await Horario.verificarConflicto(
    id_asignatura_profesor, 
    dia_semana, 
    hora_inicio, 
    hora_fin,
    id_horario
  );
  
  if (conflicto.tieneConflicto) {
    return res.status(409).json({ 
      error: 'Conflicto de horario',
      mensaje: conflicto.tieneConflicto ? conflicto.mensaje : '',
      conflicto: true
    });
  }
  
  try {
    const horario = await Horario.update(id_horario, id_asignatura_profesor, dia_semana, hora_inicio, hora_fin, aula);

    await registrarBitacora(
      req.user.id,
      'EDITAR_HORARIO',
      `El coordinador ${req.user.correo} editó el bloque de horario con ID: ${id_horario} para el día ${dia_semana} de ${hora_inicio} a ${hora_fin} en el aula ${aula}.`
    );

    res.json(horario);
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

  // Validar permisos del coordinador sobre la carrera de la asignatura
  if (req.user.esCoordinador && !req.user.roles.includes('auditor')) {
    try {
      const asigRes = await pool.query('SELECT id_carrera FROM asignatura WHERE id_asignatura = $1', [id_asignatura]);
      if (asigRes.rows.length > 0) {
        const idCarrera = asigRes.rows[0].id_carrera;
        if (!req.user.ids_carreras || !req.user.ids_carreras.map(Number).includes(Number(idCarrera))) {
          return res.status(403).json({ error: 'No tienes permiso para asignar profesores en esta carrera' });
        }
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error de validación de permisos' });
    }
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

    await registrarBitacora(
      req.user.id,
      'ASIGNAR_PROFESOR_ASIGNATURA',
      `El coordinador ${req.user.correo} asignó al docente ID: ${id_profesor} a la asignatura ID: ${id_asignatura} (Asignación ID: ${nextId}).`
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