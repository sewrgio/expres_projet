import pool from '../src/config/db.js';

async function fixAdjuntoCoordinadorIds() {
  console.log('=== Actualizando id_coordinador de adjuntos para que coincidan con coordinadores principales ===\n');
  
  // Obtener todos los adjuntos
  const adjuntosRes = await pool.query(`
    SELECT u.id_usuario, u.nombre, u.apellido, u.cedula,
           c.id_coordinador as adjunto_coord_id, c.id_carrera,
           car.nombre_carrera
    FROM usuario u
    JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
    JOIN coordinador c ON ur.id_usuario_rol = c.id_usuario_rol
    JOIN carrera car ON c.id_carrera = car.id_carrera
    WHERE u.rol @> '["adjunto coordinacion"]'::jsonb
      AND ur.activo = true 
      AND c.activo = true
  `);
  
  console.log(`Encontrados ${adjuntosRes.rows.length} adjuntos:\n`);
  
  for (const adjunto of adjuntosRes.rows) {
    console.log(`Adjunto: ${adjunto.nombre} ${adjunto.apellido} (${adjunto.nombre_carrera})`);
    console.log(`  ID Coordinador actual: ${adjunto.adjunto_coord_id}`);
    console.log(`  ID Carrera: ${adjunto.id_carrera}`);
    
    // Obtener el coordinador principal de esa carrera
    const coordPrincipalRes = await pool.query(`
      SELECT c.id_coordinador, u.nombre, u.apellido
      FROM coordinador c
      JOIN usuario_rol ur ON c.id_usuario_rol = ur.id_usuario_rol
      JOIN usuario u ON ur.id_usuario = u.id_usuario
      WHERE c.id_carrera = $1 AND c.activo = true AND ur.activo = true
      AND u.rol @> '["coordinador"]'::jsonb
      LIMIT 1
    `, [adjunto.id_carrera]);
    
    if (coordPrincipalRes.rows.length > 0) {
      const coordPrincipal = coordPrincipalRes.rows[0];
      console.log(`  Coordinador principal: ${coordPrincipal.nombre} ${coordPrincipal.apellido} (ID: ${coordPrincipal.id_coordinador})`);
      
      if (adjunto.adjunto_coord_id !== coordPrincipal.id_coordinador) {
        console.log(`  ⚠️ Diferente - Actualizando de ${adjunto.adjunto_coord_id} a ${coordPrincipal.id_coordinador}`);
        
        // Actualizar el id_coordinador del adjunto
        await pool.query(`
          UPDATE coordinador 
          SET id_coordinador = $1 
          WHERE id_carrera = $2 AND id_usuario_rol IN (
            SELECT ur.id_usuario_rol 
            FROM usuario_rol ur 
            JOIN usuario u ON ur.id_usuario = u.id_usuario
            WHERE u.id_usuario = $3 AND u.rol @> '["adjunto coordinacion"]'::jsonb
          )
        `, [coordPrincipal.id_coordinador, adjunto.id_carrera, adjunto.id_usuario]);
        
        console.log(`  ✅ Actualizado`);
      } else {
        console.log(`  ✅ Ya coincide - No necesita actualización`);
      }
    } else {
      console.log(`  ⚠️ No se encontró coordinador principal para esta carrera`);
    }
    
    console.log('');
  }
  
  console.log('=== Proceso completado ===');
}

try {
  await fixAdjuntoCoordinadorIds();
  process.exit(0);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
