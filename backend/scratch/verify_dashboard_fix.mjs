import pool from '../src/config/db.js';

async function verifyDashboardFix() {
  console.log('=== Verificando que la modificación del endpoint dashboard-stats funcione correctamente ===\n');
  
  // Simular la lógica del endpoint para ambos usuarios
  const users = [
    { id: 101, nombre: 'Coordinador Informática', esAdjunto: false },
    { id: 451, nombre: 'Adjunto Informática', esAdjunto: true },
    { id: 452, nombre: 'Adjunto Electrónica', esAdjunto: true }
  ];
  
  for (const user of users) {
    console.log(`\n--- ${user.nombre} (ID: ${user.id}) ---`);
    
    // Obtener carreras del usuario (simulando req.user.carreras)
    const carrerasRes = await pool.query(`
      SELECT c.id_carrera, car.nombre_carrera
      FROM coordinador c
      JOIN carrera car ON c.id_carrera = car.id_carrera
      JOIN usuario_rol ur ON c.id_usuario_rol = ur.id_usuario_rol
      WHERE ur.id_usuario = $1 AND c.activo = true AND ur.activo = true
    `, [user.id]);
    
    let idCarrera = carrerasRes.rows.length > 0 ? carrerasRes.rows[0].id_carrera : null;
    console.log(`Carrera del usuario: ${carrerasRes.rows[0]?.nombre_carrera} (ID: ${idCarrera})`);
    
    // Si es adjunto, obtener la carrera del coordinador principal (simulando mi modificación)
    if (user.esAdjunto) {
      const coordinadorRes = await pool.query(`
        SELECT id_coordinador FROM coordinador WHERE id_usuario_rol IN (
          SELECT ur.id_usuario_rol FROM usuario_rol ur WHERE ur.id_usuario = $1
        ) AND activo = true LIMIT 1
      `, [user.id]);
      
      if (coordinadorRes.rows.length > 0) {
        const idCoordinador = coordinadorRes.rows[0].id_coordinador;
        console.log(`ID Coordinador del adjunto: ${idCoordinador}`);
        
        const coordCarreraRes = await pool.query(
          `SELECT id_carrera FROM coordinador WHERE id_coordinador = $1 AND activo = true LIMIT 1`,
          [idCoordinador]
        );
        
        if (coordCarreraRes.rows.length > 0) {
          idCarrera = coordCarreraRes.rows[0].id_carrera;
          console.log(`Carrera del coordinador principal (usada para filtro): ID ${idCarrera}`);
        }
      }
    }
    
    // Obtener totales de hoy con el idCarrera final
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
    
    console.log(`Totales de hoy: Asistencias ${totalesHoy.asistencias}, Inasistencias ${totalesHoy.inasistencias}, Justificativos ${totalesHoy.justificativos}`);
  }
  
  console.log('\n=== Verificación completada ===');
}

try {
  await verifyDashboardFix();
  process.exit(0);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
