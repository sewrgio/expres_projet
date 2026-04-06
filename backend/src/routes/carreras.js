import express from 'express';
import Carrera from '../models/carrera.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const carreras = await Carrera.findAll();
    res.json(carreras);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.post('/', auth, async (req, res) => {
  if (!req.user.esCoordinador) {
    return res.status(403).json({ error: 'Acceso denegado' });
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

export default router;