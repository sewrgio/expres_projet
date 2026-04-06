import express from 'express';
import Asignatura from '../models/asignatura.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Obtener todas las asignaturas
router.get('/', auth, async (req, res) => {
  try {
    const asignaturas = await Asignatura.findAll();
    res.json(asignaturas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Obtener asignaturas por carrera
router.get('/carrera/:id', auth, async (req, res) => {
  try {
    const asignaturas = await Asignatura.findByCarrera(req.params.id);
    res.json(asignaturas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
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

// Actualizar asignatura
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

// Eliminar asignatura
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