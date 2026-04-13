import express from 'express';
import Justificativo from '../models/justificativo.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// ✅ NUEVO: Obtener todos los justificativos (para el frontend)
router.get('/', auth, async (req, res) => {
  try {
    let justificativos;
    
    if (req.user.esCoordinador) {
      // Coordinador ve todos
      justificativos = await Justificativo.obtenerTodos();
    } else if (req.user.esProfesor) {
      // Profesor solo ve los suyos
      justificativos = await Justificativo.findByProfesor(req.user.id_profesor);
    } else {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    res.json(justificativos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Crear justificativo (profesor)
router.post('/', auth, async (req, res) => {
  if (!req.user.esProfesor) {
    return res.status(403).json({ error: 'Solo profesores pueden solicitar justificativos' });
  }

  const { id_asistencia, motivo, documento_url } = req.body;
  try {
    const justificativo = await Justificativo.create(id_asistencia, motivo, documento_url);
    res.status(201).json(justificativo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Obtener mis justificativos (profesor)
router.get('/mis-justificativos', auth, async (req, res) => {
  if (!req.user.esProfesor) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  try {
    const justificativos = await Justificativo.findByProfesor(req.user.id_profesor);
    res.json(justificativos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Obtener justificativos pendientes (coordinador)
router.get('/pendientes', auth, async (req, res) => {
  if (!req.user.esCoordinador) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  try {
    const justificativos = await Justificativo.findByCoordinador(req.user.id_coordinador);
    const pendientes = justificativos.filter(j => j.estado === 'pendiente');
    res.json(pendientes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Aprobar justificativo
router.put('/aprobar/:id', auth, async (req, res) => {
  if (!req.user.esCoordinador) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  const { observaciones } = req.body;
  try {
    const justificativo = await Justificativo.aprobar(req.params.id, observaciones);
    res.json(justificativo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Rechazar justificativo
router.put('/rechazar/:id', auth, async (req, res) => {
  if (!req.user.esCoordinador) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  const { observaciones } = req.body;
  try {
    const justificativo = await Justificativo.rechazar(req.params.id, observaciones);
    res.json(justificativo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;