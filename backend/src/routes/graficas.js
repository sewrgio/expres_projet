import express from 'express';
import pool from '../config/db.js';
import auth from '../middleware/auth.js';

const router = express.Router();

/**
 * Función central que obtiene TODOS los datos de gráficas del sistema.
 * Se reutiliza tanto en el endpoint REST como en el stream SSE.
 */
const obtenerDatosGraficas = async (user) => {
  const esAuditor = user.roles.includes('auditor');
  const idCarrera = user.carreras && user.carreras.length > 0 ? user.carreras[0].id : null;
  const filtroCarrera = esAuditor ? null : idCarrera;

  // ── helpers ──────────────────────────────────────────────────────────────
  const semanalByDow = async (tabla, filtro) => {
    if (tabla === 'asistencias') {
      const r = await pool.query(`
        SELECT EXTRACT(ISODOW FROM a.fecha_entrada) as dow, COUNT(DISTINCT a.id_asistencia) as n
        FROM asistencia a
        JOIN profesor p ON a.id_profesor = p.id_profesor
        LEFT JOIN profesor_carrera pc ON p.id_profesor = pc.id_profesor AND pc.activo = true
        WHERE a.fecha_entrada >= date_trunc('week', NOW())
          AND a.fecha_salida IS NOT NULL
          AND ($1::integer IS NULL OR pc.id_carrera = $1)
        GROUP BY dow
      `, [filtro]);
      const arr = [0, 0, 0, 0, 0];
      r.rows.forEach(x => { const i = parseInt(x.dow) - 1; if (i >= 0 && i < 5) arr[i] = parseInt(x.n); });
      return arr;
    }
    if (tabla === 'inasistencias') {
      const r = await pool.query(`
        SELECT EXTRACT(ISODOW FROM a.fecha_entrada) as dow, COUNT(DISTINCT a.id_asistencia) as n
        FROM asistencia a
        JOIN profesor p ON a.id_profesor = p.id_profesor
        LEFT JOIN profesor_carrera pc ON p.id_profesor = pc.id_profesor AND pc.activo = true
        WHERE a.fecha_entrada >= date_trunc('week', NOW())
          AND a.fecha_salida IS NULL
          AND DATE(a.fecha_entrada) < CURRENT_DATE
          AND ($1::integer IS NULL OR pc.id_carrera = $1)
        GROUP BY dow
      `, [filtro]);
      const arr = [0, 0, 0, 0, 0];
      r.rows.forEach(x => { const i = parseInt(x.dow) - 1; if (i >= 0 && i < 5) arr[i] = parseInt(x.n); });
      return arr;
    }
    if (tabla === 'justificativos') {
      const r = await pool.query(`
        SELECT EXTRACT(ISODOW FROM j.fecha_solicitud) as dow, COUNT(DISTINCT j.id_justificativo) as n
        FROM justificativo j
        JOIN asistencia a ON j.id_asistencia = a.id_asistencia
        JOIN profesor p ON a.id_profesor = p.id_profesor
        LEFT JOIN profesor_carrera pc ON p.id_profesor = pc.id_profesor AND pc.activo = true
        WHERE j.fecha_solicitud >= date_trunc('week', NOW())
          AND ($1::integer IS NULL OR pc.id_carrera = $1)
        GROUP BY dow
      `, [filtro]);
      const arr = [0, 0, 0, 0, 0];
      r.rows.forEach(x => { const i = parseInt(x.dow) - 1; if (i >= 0 && i < 5) arr[i] = parseInt(x.n); });
      return arr;
    }
  };

  const totalesHoy = async (filtro) => {
    const [a, b, c] = await Promise.all([
      pool.query(`
        SELECT COUNT(DISTINCT a.id_asistencia) as n FROM asistencia a
        JOIN profesor p ON a.id_profesor = p.id_profesor
        LEFT JOIN profesor_carrera pc ON p.id_profesor = pc.id_profesor AND pc.activo = true
        WHERE DATE(a.fecha_entrada) = CURRENT_DATE AND a.fecha_salida IS NOT NULL
          AND ($1::integer IS NULL OR pc.id_carrera = $1)
      `, [filtro]),
      pool.query(`
        SELECT COUNT(DISTINCT a.id_asistencia) as n FROM asistencia a
        JOIN profesor p ON a.id_profesor = p.id_profesor
        LEFT JOIN profesor_carrera pc ON p.id_profesor = pc.id_profesor AND pc.activo = true
        WHERE DATE(a.fecha_entrada) = CURRENT_DATE AND a.fecha_salida IS NULL
          AND ($1::integer IS NULL OR pc.id_carrera = $1)
      `, [filtro]),
      pool.query(`
        SELECT COUNT(DISTINCT j.id_justificativo) as n FROM justificativo j
        JOIN asistencia a ON j.id_asistencia = a.id_asistencia
        JOIN profesor p ON a.id_profesor = p.id_profesor
        LEFT JOIN profesor_carrera pc ON p.id_profesor = pc.id_profesor AND pc.activo = true
        WHERE DATE(j.fecha_solicitud) = CURRENT_DATE
          AND ($1::integer IS NULL OR pc.id_carrera = $1)
      `, [filtro]),
    ]);
    return {
      asistencias: parseInt(a.rows[0].n) || 0,
      inasistencias: parseInt(b.rows[0].n) || 0,
      justificativos: parseInt(c.rows[0].n) || 0,
    };
  };

  // ── ejecutar en paralelo ──────────────────────────────────────────────────
  const [
    semanalAsistencias,
    semanalInasistencias,
    semanalJustificativos,
    hoy,
  ] = await Promise.all([
    semanalByDow('asistencias', filtroCarrera),
    semanalByDow('inasistencias', filtroCarrera),
    semanalByDow('justificativos', filtroCarrera),
    totalesHoy(filtroCarrera),
  ]);

  // Conteo de profesores activos
  const profRes = await pool.query(`
    SELECT COUNT(DISTINCT p.id_profesor) as n
    FROM profesor p
    LEFT JOIN profesor_carrera pc ON p.id_profesor = pc.id_profesor AND pc.activo = true
    WHERE p.activo = true
      AND ($1::integer IS NULL OR pc.id_carrera = $1)
  `, [filtroCarrera]);
  const profesoresCount = parseInt(profRes.rows[0].n) || 0;

  // KPIs específicos por rol
  let extra = {};

  if (esAuditor) {
    const [bitacoraRes, coordRes, scansRes, horasRes] = await Promise.all([
      pool.query('SELECT COUNT(*) as n FROM bitacora_logs'),
      pool.query(`
        SELECT COUNT(DISTINCT u.id_usuario) as n FROM usuario u
        JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
        JOIN categoria c ON ur.id_categoria = c.id_categoria
        WHERE LOWER(c.nombre) = 'coordinador' AND c.tip_id = 1 AND u.activo = true
      `),
      pool.query(`
        SELECT COUNT(a.fecha_entrada) + COUNT(a.fecha_salida) as n
        FROM asistencia a WHERE DATE(a.fecha_entrada) = CURRENT_DATE
      `),
      pool.query(`
        SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (a.fecha_salida - a.fecha_entrada))/3600), 0) as n
        FROM asistencia a WHERE DATE(a.fecha_entrada) = CURRENT_DATE AND a.fecha_salida IS NOT NULL
      `),
    ]);
    extra = {
      bitacoraCount: parseInt(bitacoraRes.rows[0].n) || 0,
      coordinadoresCount: parseInt(coordRes.rows[0].n) || 0,
      totalHoy: parseInt(scansRes.rows[0].n) || 0,
      horasHoy: parseFloat(horasRes.rows[0].n).toFixed(1),
    };
  } else {
    // Justificativos por estado (para coordinador/adjunto)
    const justRes = await pool.query(`
      SELECT j.estado, COUNT(DISTINCT j.id_justificativo) as n
      FROM justificativo j
      JOIN asistencia a ON j.id_asistencia = a.id_asistencia
      JOIN profesor p ON a.id_profesor = p.id_profesor
      LEFT JOIN profesor_carrera pc ON p.id_profesor = pc.id_profesor AND pc.activo = true
      WHERE ($1::integer IS NULL OR pc.id_carrera = $1)
      GROUP BY j.estado
    `, [filtroCarrera]);
    let aprobados = 0, pendientes = 0, rechazados = 0;
    justRes.rows.forEach(r => {
      if (r.estado === 'aprobado') aprobados = parseInt(r.n);
      if (r.estado === 'pendiente') pendientes = parseInt(r.n);
      if (r.estado === 'rechazado') rechazados = parseInt(r.n);
    });
    const total = aprobados + pendientes + rechazados;
    extra = {
      justificativosEstatus: { aprobados, pendientes, rechazados, total: total || 0 },
    };
  }

  return {
    esAuditor,
    semanalAsistencias,
    semanalInasistencias,
    semanalJustificativos,
    totalesHoy: hoy,
    profesoresCount,
    timestamp: new Date().toISOString(),
    ...extra,
  };
};

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/graficas/stats  — snapshot REST normal (para compatibilidad)
// ══════════════════════════════════════════════════════════════════════════════
router.get('/stats', auth, async (req, res) => {
  try {
    const data = await obtenerDatosGraficas(req.user);
    res.json(data);
  } catch (err) {
    console.error('[Graficas] Error en /stats:', err);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/graficas/stream  — Server-Sent Events (push cada 5 s)
//  El cliente se conecta una sola vez y recibe updates automáticos.
// ══════════════════════════════════════════════════════════════════════════════
router.get('/stream', auth, async (req, res) => {
  // Configurar SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // deshabilitar buffer en Nginx
  res.flushHeaders();

  const enviar = async () => {
    try {
      const data = await obtenerDatosGraficas(req.user);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      console.error('[Graficas SSE] Error generando datos:', err);
      res.write(`data: ${JSON.stringify({ error: true })}\n\n`);
    }
  };

  // Enviar primer paquete inmediatamente
  await enviar();

  // Enviar cada 5 segundos
  const intervalo = setInterval(enviar, 5000);

  // Limpiar cuando el cliente desconecte
  req.on('close', () => {
    clearInterval(intervalo);
    console.log(`[Graficas SSE] Cliente desconectado: user ${req.user.id_usuario}`);
  });
});

export default router;
