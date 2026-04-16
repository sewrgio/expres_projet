import express from 'express';
import Horario from '../models/horario.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Obtener todos los horarios
router.get('/', auth, async (req, res) => {
  try {
    const horarios = await Horario.findAll();
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
  if (!req.user.esCoordinador) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  try {
    const data = await Horario.getAsignaturasConProfesores();
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

export default router;