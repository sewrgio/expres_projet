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

// ✅ ENDPOINT CORREGIDO: Obtener QR del usuario para mostrar
router.get('/mi-qr', auth, async (req, res) => {
  try {
    const idUsuario = req.user.id;
    let identificador;

    if (req.user.esProfesor) {
      identificador = `profesor_${req.user.id_profesor}`;
    } else if (req.user.esCoordinador) {
      identificador = `coordinador_${req.user.id_coordinador}`;
    } else {
      identificador = `auditor_${idUsuario}`;
    }

    // Generar un código único
    const codigoQR = `${identificador}_${Date.now()}`;

    // Generar imagen QR en base64
    const qrImage = await QRCode.toDataURL(codigoQR);

    res.json({
      success: true,
      codigo: codigoQR,
      imagen: qrImage
    });

  } catch (error) {
    console.error('Error obteniendo QR:', error);
    res.status(500).json({ error: 'Error al obtener QR' });
  }
});

// ✅ NUEVO: Obtener QRs estáticos de Coordinación
router.get('/estaticos', auth, async (req, res) => {
  if (!req.user.esCoordinador && !req.user.roles.includes('auditor')) {
    return res.status(403).json({ error: 'Solo coordinadores y auditores pueden ver QRs estáticos' });
  }

  try {
    const qrEstaticos = await QR.obtenerQRsEstaticos();

    // Generar imágenes QR para cada código estático
    const qrConImagenes = await Promise.all(
      qrEstaticos.map(async (qr) => {
        const qrImage = await QRCode.toDataURL(qr.codigo);
        return {
          ...qr,
          imagen: qrImage
        };
      })
    );

    res.json({
      success: true,
      qrs: qrConImagenes
    });
  } catch (error) {
    console.error('Error obteniendo QRs estáticos:', error);
    res.status(500).json({ error: 'Error al obtener QRs estáticos' });
  }
});

export default router;