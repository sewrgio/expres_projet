import express from 'express';
import auth from '../middleware/auth.js';
import Geofence from '../models/geofence.js';
import pool from '../config/db.js';

const router = express.Router();

// ✅ NUEVO: APK móvil envía ubicación del usuario
router.post('/ubicacion', auth, async (req, res) => {
  const { latitud, longitud, precision } = req.body;

  if (!latitud || !longitud) {
    return res.status(400).json({ error: 'Latitud y longitud son requeridos' });
  }

  try {
    // Guardar o actualizar la ubicación más reciente del usuario
    const query = `
      INSERT INTO ubicacion_usuario (id_usuario, latitud, longitud, precision, fecha_actualizacion)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (id_usuario) 
      DO UPDATE SET 
        latitud = EXCLUDED.latitud,
        longitud = EXCLUDED.longitud,
        precision = EXCLUDED.precision,
        fecha_actualizacion = NOW()
    `;
    await pool.query(query, [req.user.id, latitud, longitud, precision || null]);

    // Calcular distancia a IUJO
    const IUJO_COORDS = { lat: 10.510717, lon: -66.936949 };
    const distancia = calcularDistancia(latitud, longitud, IUJO_COORDS.lat, IUJO_COORDS.lon);
    const enArea = distancia <= 1.0; // 1 km de radio

    res.json({
      success: true,
      distancia: distancia,
      enArea: enArea,
      mensaje: enArea ? 'Dentro del campus' : 'Fuera del campus'
    });
  } catch (error) {
    console.error('Error guardando ubicación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ✅ NUEVO: Frontend web consulta ubicación del usuario (desde APK)
router.get('/ubicacion', auth, async (req, res) => {
  try {
    const query = `
      SELECT latitud, longitud, precision, fecha_actualizacion
      FROM ubicacion_usuario
      WHERE id_usuario = $1
    `;
    const result = await pool.query(query, [req.user.id]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        ubicacion: null,
        mensaje: 'No hay ubicación registrada'
      });
    }

    const ubicacion = result.rows[0];
    const IUJO_COORDS = { lat: 10.510717, lon: -66.936949 };
    const distancia = calcularDistancia(ubicacion.latitud, ubicacion.longitud, IUJO_COORDS.lat, IUJO_COORDS.lon);
    const enArea = distancia <= 1.0;

    res.json({
      success: true,
      ubicacion: {
        latitud: ubicacion.latitud,
        longitud: ubicacion.longitud,
        precision: ubicacion.precision,
        fecha_actualizacion: ubicacion.fecha_actualizacion
      },
      distancia: distancia,
      enArea: enArea
    });
  } catch (error) {
    console.error('Error obteniendo ubicación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Función auxiliar para calcular distancia
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

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

// Crear nueva geocerca - disponible para todos excepto auditor
router.post('/geofences', auth, async (req, res) => {
  if (req.user.roles.includes('auditor')) {
    return res.status(403).json({ error: 'El auditor no puede crear geocercas' });
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

// Actualizar geocerca - disponible para todos excepto auditor
router.put('/geofences/:id', auth, async (req, res) => {
  if (req.user.roles.includes('auditor')) {
    return res.status(403).json({ error: 'El auditor no puede actualizar geocercas' });
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

// Eliminar geocerca - disponible para todos excepto auditor
router.delete('/geofences/:id', auth, async (req, res) => {
  if (req.user.roles.includes('auditor')) {
    return res.status(403).json({ error: 'El auditor no puede eliminar geocercas' });
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

// Obtener eventos recientes de todos los usuarios - disponible para todos excepto auditor
router.get('/eventos-recientes', auth, async (req, res) => {
  if (req.user.roles.includes('auditor')) {
    return res.status(403).json({ error: 'El auditor no puede ver eventos recientes' });
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
