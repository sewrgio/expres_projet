import express from 'express';
import auth from '../middleware/auth.js';

const router = express.Router();

// Coordenadas del campus IUJO
const CAMPUS_COORDS = {
  lat: 10.510717,
  lon: -66.936949
};

// Radio permitido en kilómetros
const RADIO_PERMITIDO_KM = 1.0;

// Función para calcular distancia entre dos coordenadas (fórmula Haversine)
const calcularDistancia = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

// Validar ubicación (público - no requiere autenticación obligatoria para la app móvil)
router.post('/validar', async (req, res) => {
  const { latitud, longitud } = req.body;

  if (!latitud || !longitud) {
    return res.status(400).json({ error: 'Latitud y longitud son requeridos' });
  }

  try {
    const distancia = calcularDistancia(
      latitud,
      longitud,
      CAMPUS_COORDS.lat,
      CAMPUS_COORDS.lon
    );

    const dentroRango = distancia <= RADIO_PERMITIDO_KM;

    // Intentar actualizar la ubicación en DB si se proporciona token
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'iujo_secret_key_2024');
        if (decoded && decoded.id) {
          const query = `
            INSERT INTO ubicacion_usuario (id_usuario, latitud, longitud, fecha_actualizacion)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (id_usuario)
            DO UPDATE SET
              latitud = EXCLUDED.latitud,
              longitud = EXCLUDED.longitud,
              fecha_actualizacion = NOW()
          `;
          await pool.query(query, [decoded.id, latitud, longitud]);
        }
      } catch (err) {
        console.error('Error al actualizar ubicación con token en /validar:', err.message);
      }
    }

    res.json({
      success: true,
      dentro_rango: dentroRango,
      distancia_km: distancia,
      distancia_metros: distancia * 1000,
      radio_permitido_km: RADIO_PERMITIDO_KM,
      campus_coords: CAMPUS_COORDS,
      mensaje: dentroRango
        ? 'Está dentro del rango permitido para escanear'
        : 'Está fuera del rango permitido para escanear'
    });
  } catch (error) {
    console.error('Error validando ubicación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener coordenadas del campus (público)
router.get('/campus', async (req, res) => {
  res.json({
    success: true,
    campus_coords: CAMPUS_COORDS,
    radio_permitido_km: RADIO_PERMITIDO_KM
  });
});

export default router;
