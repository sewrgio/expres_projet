import express from 'express';
import Profesor from '../models/profesor.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, async (req, res) => {
  if (!req.user.esCoordinador) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  
  try {
    const profesores = await Profesor.findAll();
    res.json(profesores);
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

export default router;