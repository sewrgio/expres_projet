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

  const { descripcion, ubicacion, horasValidez } = req.body;
  const coordinadorId = req.user.id_coordinador;

  if (!coordinadorId) {
    return res.status(400).json({ error: 'ID de coordinador no encontrado' });
  }

  try {
    const qr = await QR.generar(coordinadorId, descripcion || '', ubicacion || '', horasValidez || 2);
    const qrImage = await QRCode.toDataURL(qr.codigo_qr);
    
    res.json({
      success: true,
      qr: {
        id: qr.id_qr,
        codigo: qr.codigo_qr,
        imagen: qrImage,
        imagen_qr: qrImage, // Redundancia
        fecha_creacion: qr.fecha_creacion,
        fecha_expiracion: qr.fecha_expiracion,
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
    
    // Generar imágenes QR para cada código
    const qrsConImagenes = await Promise.all(
      qrs.map(async (qr) => {
        try {
          const qrImage = await QRCode.toDataURL(qr.codigo_qr || 'INVALID');
          return {
            ...qr,
            imagen: qrImage,
            imagen_qr: qrImage,
            activo: qr.activo && qr.vigente // Combinar estado manual con expiración
          };
        } catch (e) {
          console.error('Error generando QR para:', qr.codigo_qr, e);
          return { ...qr, imagen: null };
        }
      })
    );
    
    res.json(qrsConImagenes);
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

router.put('/activar/:id', auth, async (req, res) => {
  if (!req.user.esCoordinador) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  try {
    const qr = await QR.activar(req.params.id);
    res.json({ success: true, message: 'QR activado', qr });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al activar QR' });
  }
});

// ✅ NUEVO: Editar información del QR (solo coordinador)
router.put('/:id', auth, async (req, res) => {
  if (!req.user.esCoordinador) {
    return res.status(403).json({ error: 'Solo coordinadores pueden editar sus QR' });
  }

  const qrId = req.params.id;
  const coordinadorId = req.user.id_coordinador;

  try {
    // Verificar que el QR pertenece al coordinador
    const qrExistente = await pool.query(
      'SELECT * FROM qr WHERE id_qr = $1 AND id_coordinador = $2',
      [qrId, coordinadorId]
    );

    if (qrExistente.rows.length === 0) {
      return res.status(403).json({ error: 'No tienes permiso para editar este QR' });
    }

    // Actualizar el QR
    const { descripcion, ubicacion, horasExtension } = req.body;
    const result = await pool.query(
      `UPDATE qr 
       SET descripcion = $1, 
           ubicacion = $2,
           fecha_expiracion = CASE 
             WHEN $3 > 0 THEN COALESCE(fecha_expiracion, NOW()) + ($3 || ' hours')::interval 
             ELSE fecha_expiracion 
           END
       WHERE id_qr = $4 AND id_coordinador = $5 
       RETURNING *`,
      [descripcion || '', ubicacion || '', horasExtension || 0, qrId, coordinadorId]
    );

    const qrActualizado = result.rows[0];
    
    // Generar nueva imagen
    const qrImage = await QRCode.toDataURL(qrActualizado.codigo_qr);

    res.json({
      success: true,
      message: 'QR actualizado correctamente',
      qr: {
        id: qrActualizado.id_qr,
        codigo: qrActualizado.codigo_qr,
        imagen: qrImage,
        fecha_creacion: qrActualizado.fecha_creacion,
        descripcion: qrActualizado.descripcion,
        ubicacion: qrActualizado.ubicacion,
        activo: qrActualizado.activo
      }
    });
  } catch (error) {
    console.error('Error editando QR:', error);
    res.status(500).json({ error: 'Error al editar el QR' });
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

// ✅ NUEVO: Crear QR fijo (solo auditor)
router.post('/fijos', auth, async (req, res) => {
  if (!req.user.roles.includes('auditor')) {
    return res.status(403).json({ error: 'Solo el auditor puede crear QRs fijos' });
  }

  const { nombre, codigo } = req.body;

  if (!nombre || !codigo) {
    return res.status(400).json({ error: 'Nombre y código son requeridos' });
  }

  try {
    const qr = await QR.crearQRFijo(nombre, codigo);
    res.json({
      success: true,
      message: 'QR fijo creado exitosamente',
      qr
    });
  } catch (error) {
    console.error('Error creando QR fijo:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Ya existe un QR con ese código' });
    } else {
      res.status(500).json({ error: 'Error al crear QR fijo' });
    }
  }
});

// ✅ NUEVO: Activar QR fijo (solo auditor)
router.put('/fijos/:id/activar', auth, async (req, res) => {
  if (!req.user.roles.includes('auditor')) {
    return res.status(403).json({ error: 'Solo el auditor puede activar QRs fijos' });
  }

  try {
    const qr = await QR.activarQRFijo(req.params.id);
    res.json({
      success: true,
      message: 'QR fijo activado',
      qr
    });
  } catch (error) {
    console.error('Error activando QR fijo:', error);
    res.status(500).json({ error: 'Error al activar QR fijo' });
  }
});

// ✅ NUEVO: Desactivar QR fijo (solo auditor)
router.put('/fijos/:id/desactivar', auth, async (req, res) => {
  if (!req.user.roles.includes('auditor')) {
    return res.status(403).json({ error: 'Solo el auditor puede desactivar QRs fijos' });
  }

  try {
    const qr = await QR.desactivarQRFijo(req.params.id);
    res.json({
      success: true,
      message: 'QR fijo desactivado',
      qr
    });
  } catch (error) {
    console.error('Error desactivando QR fijo:', error);
    res.status(500).json({ error: 'Error al desactivar QR fijo' });
  }
});

export default router;