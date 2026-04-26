import express from 'express';
import auth from '../middleware/auth.js';
import Geofence from '../models/geofence.js';

const router = express.Router();

// Validar posición contra geofences (público para app móvil)
router.post('/validar', async (req, res) => {
  const { latitud, longitud, id_geofence } = req.body;

  if (!latitud || !longitud) {
    return res.status(400).json({ error: 'Latitud y longitud son requeridos' });
  }

  try {
    const resultados = await Geofence.validarPosicion(latitud, longitud, id_geofence);
    res.json({
      success: true,
      resultados
    });
  } catch (error) {
    console.error('Error validando posición:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Procesar cambio de estado de geofencing (requiere autenticación)
router.post('/procesar', auth, async (req, res) => {
  const { latitud, longitud } = req.body;

  if (!latitud || !longitud) {
    return res.status(400).json({ error: 'Latitud y longitud son requeridos' });
  }

  try {
    const eventos = await Geofence.procesarCambioEstado(req.user.id, latitud, longitud);
    res.json({
      success: true,
      eventos,
      mensaje: `Se registraron ${eventos.length} eventos de geofencing`
    });
  } catch (error) {
    console.error('Error procesando cambio de estado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener todos los geofences (requiere autenticación)
router.get('/geofences', auth, async (req, res) => {
  try {
    const geofences = await Geofence.obtenerTodos();
    res.json({
      success: true,
      geofences
    });
  } catch (error) {
    console.error('Error obteniendo geofences:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener un geofence por ID (requiere autenticación)
router.get('/geofences/:id', auth, async (req, res) => {
  try {
    const geofence = await Geofence.obtenerPorId(req.params.id);
    if (!geofence) {
      return res.status(404).json({ error: 'Geofence no encontrado' });
    }
    res.json({
      success: true,
      geofence
    });
  } catch (error) {
    console.error('Error obteniendo geofence:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nuevo geofence (solo auditor)
router.post('/geofences', auth, async (req, res) => {
  if (!req.user.roles.includes('auditor')) {
    return res.status(403).json({ error: 'Solo el auditor puede crear geofences' });
  }

  const { nombre, latitud, longitud, radio_metros } = req.body;

  if (!nombre || !latitud || !longitud || !radio_metros) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  try {
    const geofence = await Geofence.crear(nombre, latitud, longitud, radio_metros);
    res.status(201).json({
      success: true,
      geofence
    });
  } catch (error) {
    console.error('Error creando geofence:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar geofence (solo auditor)
router.put('/geofences/:id', auth, async (req, res) => {
  if (!req.user.roles.includes('auditor')) {
    return res.status(403).json({ error: 'Solo el auditor puede editar geofences' });
  }

  const { nombre, latitud, longitud, radio_metros, activo } = req.body;

  try {
    const geofence = await Geofence.actualizar(req.params.id, nombre, latitud, longitud, radio_metros, activo);
    if (!geofence) {
      return res.status(404).json({ error: 'Geofence no encontrado' });
    }
    res.json({
      success: true,
      geofence
    });
  } catch (error) {
    console.error('Error actualizando geofence:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar geofence (solo auditor)
router.delete('/geofences/:id', auth, async (req, res) => {
  if (!req.user.roles.includes('auditor')) {
    return res.status(403).json({ error: 'Solo el auditor puede eliminar geofences' });
  }

  try {
    const geofence = await Geofence.eliminar(req.params.id);
    if (!geofence) {
      return res.status(404).json({ error: 'Geofence no encontrado' });
    }
    res.json({
      success: true,
      mensaje: 'Geofence eliminado'
    });
  } catch (error) {
    console.error('Error eliminando geofence:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener historial de eventos del usuario autenticado
router.get('/historial', auth, async (req, res) => {
  try {
    const limite = parseInt(req.query.limite) || 50;
    const historial = await Geofence.obtenerHistorialUsuario(req.user.id, limite);
    res.json({
      success: true,
      historial
    });
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener eventos recientes de todos los usuarios (solo auditor)
router.get('/eventos-recientes', auth, async (req, res) => {
  if (!req.user.roles.includes('auditor')) {
    return res.status(403).json({ error: 'Solo el auditor puede ver eventos de todos los usuarios' });
  }

  try {
    const limite = parseInt(req.query.limite) || 100;
    const eventos = await Geofence.obtenerEventosRecientes(limite);
    res.json({
      success: true,
      eventos
    });
  } catch (error) {
    console.error('Error obteniendo eventos recientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
