import express from 'express';
import Justificativo from '../models/justificativo.js';
import auth from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/justificativos';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'justificativo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPG, PNG) y archivos PDF'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ✅ NUEVO: Obtener todos los justificativos (para el frontend)
router.get('/', auth, async (req, res) => {
  try {
    let justificativos;
    
    if (req.user.rol === 'auditor') {
      justificativos = await Justificativo.obtenerDeCoordinadores();
    } else if (req.user.esCoordinador) {
      justificativos = await Justificativo.obtenerTodos();
    } else if (req.user.esProfesor) {
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

// Crear justificativo (profesor y coordinador) con soporte para archivos
router.post('/', auth, upload.single('documento'), async (req, res) => {
  if (!req.user.esProfesor && !req.user.esCoordinador) {
    return res.status(403).json({ error: 'Solo profesores y coordinadores pueden solicitar justificativos' });
  }

  const { id_asistencia, motivo } = req.body;
  const documento_url = req.file ? `/uploads/justificativos/${req.file.filename}` : req.body.documento_url;

  if (!id_asistencia || !motivo) {
    return res.status(400).json({ error: 'La asistencia y el motivo son obligatorios' });
  }

  try {
    const justificativo = await Justificativo.create(id_asistencia, motivo, documento_url);
    res.status(201).json(justificativo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Obtener mis justificativos (profesor y coordinador)
router.get('/mis-justificativos', auth, async (req, res) => {
  if (!req.user.esProfesor && !req.user.esCoordinador) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  try {
    // Si es coordinador, su id_profesor es su id_usuario porque todos los registrados tienen registro en profesor
    const justificativos = await Justificativo.findByProfesor(req.user.id_profesor || req.user.id);
    res.json(justificativos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Obtener justificativos pendientes (coordinador y auditor)
router.get('/pendientes', auth, async (req, res) => {
  if (!req.user.esCoordinador && req.user.rol !== 'auditor') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  try {
    let justificativos;
    if (req.user.rol === 'auditor') {
      justificativos = await Justificativo.obtenerDeCoordinadores();
    } else {
      justificativos = await Justificativo.findByCoordinador(req.user.id_coordinador);
    }
    const pendientes = justificativos.filter(j => j.estado === 'pendiente');
    res.json(pendientes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Aprobar justificativo
router.put('/aprobar/:id', auth, async (req, res) => {
  if (!req.user.esCoordinador && req.user.rol !== 'auditor') {
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
  if (!req.user.esCoordinador && req.user.rol !== 'auditor') {
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