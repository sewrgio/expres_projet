import express from 'express';
import pool from '../config/db.js';
import auth from '../middleware/auth.js';
import fs from 'fs';

const router = express.Router();

// Middleware para registrar acciones (puedes usarlo en otras rutas o dejar la logica en cada ruta)
// Por ahora solo proveemos el endpoint de lectura para el auditor.

// Obtener registros de la bitácora (solo auditor)
router.get('/', auth, async (req, res) => {
  if (!req.user.roles.includes('auditor')) {
    return res.status(403).json({ error: 'Solo el auditor puede ver la bitácora' });
  }

  try {
    const result = await pool.query(
      `SELECT b.id, b.accion, b.detalles, b.fecha, 
              u.nombre as usuario_nombre, u.apellido as usuario_apellido, u.correo as usuario_correo
       FROM bitacora_logs b
       LEFT JOIN usuario u ON b.id_usuario = u.id_usuario
       ORDER BY b.fecha DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo bitácora:', error);
    res.status(500).json({ error: 'Error al obtener registros de bitácora' });
  }
});

// Exportar bitácora manualmente a .txt (solo auditor)
router.post('/exportar', auth, async (req, res) => {
  if (!req.user.roles.includes('auditor')) {
    return res.status(403).json({ error: 'Solo el auditor puede exportar la bitácora' });
  }

  try {
    const { verificarYEjecutarExportMensual } = await import('../utils/serverMonitor.js');
    await verificarYEjecutarExportMensual(true); // Forzar la exportación
    res.json({ success: true, message: 'La bitácora se ha exportado exitosamente a la carpeta /exports en formato .txt' });
  } catch (error) {
    console.error('Error exportando bitácora:', error);
    res.status(500).json({ error: 'Error al exportar la bitácora' });
  }
});

// Descargar bitácora directamente en formato .txt (solo auditor)
router.get('/descargar', auth, async (req, res) => {
  if (!req.user.roles.includes('auditor')) {
    return res.status(403).json({ error: 'Solo el auditor puede descargar la bitácora' });
  }

  try {
    const ahora = new Date();
    const nombresMeses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const nombreMes = nombresMeses[ahora.getMonth()];
    const filePath = `/home/sergio/Documentos/expres_projet/exports/bitacora_${nombreMes}_${ahora.getFullYear()}.txt`;

    // Si el archivo no existe físicamente, generarlo primero
    if (!fs.existsSync(filePath)) {
      const { verificarYEjecutarExportMensual } = await import('../utils/serverMonitor.js');
      await verificarYEjecutarExportMensual(true);
    }

    res.download(filePath);
  } catch (error) {
    console.error('Error descargando bitácora:', error);
    res.status(500).json({ error: 'Error al descargar el archivo de bitácora' });
  }
});

// Guardar un log (endpoint interno o utilizable desde frontend, aunque se recomienda desde backend)
router.post('/', auth, async (req, res) => {
  const { accion, detalles } = req.body;
  const id_usuario = req.user.id;
  try {
    await pool.query(
      `INSERT INTO bitacora_logs (id_usuario, accion, detalles) VALUES ($1, $2, $3)`,
      [id_usuario, accion, detalles]
    );
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error guardando en bitácora:', error);
    res.status(500).json({ error: 'Error al guardar log' });
  }
});

export default router;
