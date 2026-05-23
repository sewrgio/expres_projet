import pool from '../src/config/db.js';

// Simular el token del coordinador de informática (id_usuario: 101)
const coordinadorUserId = 101;
const adjuntoUserId = 451;

async function checkDashboardStats(userId, role) {
  console.log(`\n=== Dashboard Stats para ${role} (Usuario ID: ${userId}) ===`);
  
  // Obtener carreras del usuario
  const carrerasRes = await pool.query(`
    SELECT c.id_carrera, car.nombre_carrera
    FROM coordinador c
    JOIN carrera car ON c.id_carrera = car.id_carrera
    JOIN usuario_rol ur ON c.id_usuario_rol = ur.id_usuario_rol
    WHERE ur.id_usuario = $1 AND c.activo = true AND ur.activo = true
  `, [userId]);
  
  console.log('Carreras:', carrerasRes.rows);
  
  const idCarrera = carrerasRes.rows.length > 0 ? carrerasRes.rows[0].id_carrera : null;
  console.log('ID Carrera usado para filtro:', idCarrera);
  
  // Obtener totales de hoy
  const [asisHoy, inasHoy, justHoy] = await Promise.all([
    pool.query(`
      SELECT COUNT(DISTINCT a.id_asistencia) as total FROM asistencia a
      JOIN profesor p ON a.id_profesor = p.id_profesor
      LEFT JOIN profesor_carrera pc ON p.id_profesor = pc.id_profesor AND pc.activo = true
      WHERE DATE(a.fecha_entrada) = CURRENT_DATE AND a.fecha_salida IS NOT NULL
        AND ($1::integer IS NULL OR pc.id_carrera = $1)
    `, [idCarrera]),
    pool.query(`
      SELECT COUNT(DISTINCT a.id_asistencia) as total FROM asistencia a
      JOIN profesor p ON a.id_profesor = p.id_profesor
      LEFT JOIN profesor_carrera pc ON p.id_profesor = pc.id_profesor AND pc.activo = true
      WHERE DATE(a.fecha_entrada) = CURRENT_DATE AND a.fecha_salida IS NULL
        AND ($1::integer IS NULL OR pc.id_carrera = $1)
    `, [idCarrera]),
    pool.query(`
      SELECT COUNT(DISTINCT j.id_justificativo) as total FROM justificativo j
      JOIN asistencia a ON j.id_asistencia = a.id_asistencia
      JOIN profesor p ON a.id_profesor = p.id_profesor
      LEFT JOIN profesor_carrera pc ON p.id_profesor = pc.id_profesor AND pc.activo = true
      WHERE DATE(j.fecha_solicitud) = CURRENT_DATE
        AND ($1::integer IS NULL OR pc.id_carrera = $1)
    `, [idCarrera])
  ]);
  
  const totalesHoy = {
    asistencias: parseInt(asisHoy.rows[0].total) || 0,
    inasistencias: parseInt(inasHoy.rows[0].total) || 0,
    justificativos: parseInt(justHoy.rows[0].total) || 0,
  };
  
  console.log('Totales de hoy:', totalesHoy);
  
  // Calcular porcentajes para la gráfica de torta
  const totalHoyDona = (totalesHoy.asistencias + totalesHoy.inasistencias + totalesHoy.justificativos) || 1;
  const pctAsisHoy = Math.round((totalesHoy.asistencias / totalHoyDona) * 100);
  const pctInasHoy = Math.round((totalesHoy.inasistencias / totalHoyDona) * 100);
  const pctJustHoy = Math.max(0, 100 - pctAsisHoy - pctInasHoy);
  
  console.log('Porcentajes para gráfica de torta:');
  console.log(`  Asistencias: ${pctAsisHoy}% (${totalesHoy.asistencias})`);
  console.log(`  Inasistencias: ${pctInasHoy}% (${totalesHoy.inasistencias})`);
  console.log(`  Justificativos: ${pctJustHoy}% (${totalesHoy.justificativos})`);
}

try {
  await checkDashboardStats(coordinadorUserId, 'Coordinador Informática');
  await checkDashboardStats(adjuntoUserId, 'Adjunto Informática');
  process.exit(0);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
