import pool from '../src/config/db.js';

const adjuntoElectronicaUserId = 452;

async function checkAdjuntoCoordinador(userId) {
  console.log(`\n=== Verificando adjunto de electrónica (Usuario ID: ${userId}) ===`);
  
  // Obtener información del adjunto
  const userRes = await pool.query(`
    SELECT u.id_usuario, u.nombre, u.apellido, u.cedula, u.rol,
           c.id_coordinador, c.id_carrera, car.nombre_carrera
    FROM usuario u
    JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
    JOIN coordinador c ON ur.id_usuario_rol = c.id_usuario_rol
    JOIN carrera car ON c.id_carrera = car.id_carrera
    WHERE u.id_usuario = $1 AND ur.activo = true AND c.activo = true
  `, [userId]);
  
  const user = userRes.rows[0];
  console.log('Usuario:', user.nombre, user.apellido);
  console.log('ID Coordinador del adjunto:', user.id_coordinador);
  console.log('ID Carrera del adjunto:', user.id_carrera);
  console.log('Carrera:', user.nombre_carrera);
  
  // Obtener el coordinador principal de esa carrera
  const coordPrincipalRes = await pool.query(`
    SELECT c.id_coordinador, u.nombre, u.apellido
    FROM coordinador c
    JOIN usuario_rol ur ON c.id_usuario_rol = ur.id_usuario_rol
    JOIN usuario u ON ur.id_usuario = u.id_usuario
    WHERE c.id_carrera = $1 AND c.activo = true AND ur.activo = true
    AND u.rol @> '["coordinador"]'::jsonb
    LIMIT 1
  `, [user.id_carrera]);
  
  if (coordPrincipalRes.rows.length > 0) {
    const coordPrincipal = coordPrincipalRes.rows[0];
    console.log('\nCoordinador principal de la carrera:');
    console.log('  ID Coordinador:', coordPrincipal.id_coordinador);
    console.log('  Nombre:', coordPrincipal.nombre, coordPrincipal.apellido);
    
    if (user.id_coordinador !== coordPrincipal.id_coordinador) {
      console.log('\n⚠️ PROBLEMA: El adjunto tiene un id_coordinador diferente al coordinador principal');
      console.log('  Esto podría causar que vean datos diferentes en la gráfica de torta');
    } else {
      console.log('\n✅ OK: El adjunto usa el mismo id_coordinador que el coordinador principal');
    }
  } else {
    console.log('\n⚠️ No se encontró coordinador principal para esta carrera');
  }
}

try {
  await checkAdjuntoCoordinador(adjuntoElectronicaUserId);
  process.exit(0);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
