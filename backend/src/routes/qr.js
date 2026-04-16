import express from 'express';
import QR from '../models/qr.js';
import auth from '../middleware/auth.js';
import QRCode from 'qrcode';
import pool from '../config/db.js';

const router = express.Router();

router.post('/generar', auth, async (req, res) => {
  if (!req.user.esCoordinador) {
    return res.status(403).json({ error: 'Solo coordinadores pueden generar QR' });
  }

  const { descripcion, ubicacion } = req.body;
  const coordinadorId = req.user.id_coordinador;

  if (!coordinadorId) {
    return res.status(400).json({ error: 'ID de coordinador no encontrado' });
  }

  try {
    const qr = await QR.generar(coordinadorId, descripcion || '', ubicacion || '');
    const qrImage = await QRCode.toDataURL(qr.codigo_qr);
    
    res.json({
      success: true,
      qr: {
        id: qr.id_qr,
        codigo: qr.codigo_qr,
        imagen: qrImage,
        fecha_creacion: qr.fecha_creacion,
        descripcion: qr.descripcion,
        ubicacion: qr.ubicacion
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar QR' });
  }
});

router.get('/mis-qrs', auth, async (req, res) => {
  if (!req.user.esCoordinador) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  try {
    const qrs = await QR.obtenerPorCoordinador(req.user.id_coordinador);
    res.json(qrs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener QRs' });
  }
});

router.put('/desactivar/:id', auth, async (req, res) => {
  if (!req.user.esCoordinador) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  try {
    const qr = await QR.desactivar(req.params.id);
    res.json({ success: true, message: 'QR desactivado', qr });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al desactivar QR' });
  }
});

// ✅ ENDPOINT CORREGIDO: Obtener QR del profesor para mostrar
router.get('/mi-qr', auth, async (req, res) => {
  try {
    // Solo profesores pueden acceder
    if (!req.user.esProfesor) {
      return res.status(403).json({ error: 'Solo profesores pueden acceder' });
    }

    const idProfesor = req.user.id_profesor;
    
    if (!idProfesor) {
      return res.status(400).json({ error: 'ID de profesor no encontrado en el token' });
    }
    
    // Buscar si ya tiene un QR activo
    const result = await pool.query(
      `SELECT codigo_qr, fecha_creacion 
       FROM qr 
       WHERE id_profesor = $1 AND activo = true 
       ORDER BY id_qr DESC LIMIT 1`,
      [idProfesor]
    );
    
    let codigoQR;
    if (result.rows.length > 0) {
      codigoQR = result.rows[0].codigo_qr;
    } else {
      // Generar un QR único para el profesor
      codigoQR = `profesor_${idProfesor}_${Date.now()}`;
      
      // ✅ CORREGIDO: INSERT sin id_coordinador
      await pool.query(
        `INSERT INTO qr (codigo_qr, id_profesor, activo, fecha_creacion)
         VALUES ($1, $2, true, NOW())`,
        [codigoQR, idProfesor]
      );
    }
    
    // Generar imagen QR en base64
    const qrImage = await QRCode.toDataURL(codigoQR);
    
    res.json({
      success: true,
      codigo: codigoQR,
      imagen: qrImage
    });
    
  } catch (error) {
    console.error('Error obteniendo QR de profesor:', error);
    res.status(500).json({ error: 'Error al obtener QR' });
  }
});

export default router;