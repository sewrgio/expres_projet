import express from 'express';
import Carrera from '../models/carrera.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// ✅ Obtener todas las carreras (PÚBLICO - no requiere autenticación)
router.get('/', async (req, res) => {
  try {
    const carreras = await Carrera.findAll();
    res.json(carreras);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Crear nueva carrera (solo coordinador)
router.post('/', auth, async (req, res) => {
  if (req.user.rol !== 'auditor') {
    return res.status(403).json({ error: 'Solo el auditor puede crear carreras' });
  }
  
  const { nombre_carrera } = req.body;
  if (!nombre_carrera) {
    return res.status(400).json({ error: 'Nombre de carrera requerido' });
  }
  
  try {
    const carrera = await Carrera.create(nombre_carrera);
    res.status(201).json(carrera);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Editar carrera (solo coordinador)
router.put('/:id', auth, async (req, res) => {
  if (req.user.rol !== 'auditor') {
    return res.status(403).json({ error: 'Solo el auditor puede editar carreras' });
  }

  const { id } = req.params;
  const { nombre_carrera, activo } = req.body;

  if (!nombre_carrera) {
    return res.status(400).json({ error: 'Nombre de carrera requerido' });
  }

  try {
    const carrera = await Carrera.update(id, { nombre_carrera, activo });
    if (!carrera) {
      return res.status(404).json({ error: 'Carrera no encontrada' });
    }
    res.json(carrera);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Eliminar carrera (solo coordinador)
router.delete('/:id', auth, async (req, res) => {
  if (req.user.rol !== 'auditor') {
    return res.status(403).json({ error: 'Solo el auditor puede eliminar carreras' });
  }

  const { id } = req.params;

  try {
    const carrera = await Carrera.delete(id);
    if (!carrera) {
      return res.status(404).json({ error: 'Carrera no encontrada' });
    }
    res.json({ success: true, message: 'Carrera eliminada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;