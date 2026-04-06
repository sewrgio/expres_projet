import express from 'express';
import QR from '../models/qr.js';
import auth from '../middleware/auth.js';
import QRCode from 'qrcode';

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

export default router;