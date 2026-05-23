import pool from '../src/config/db.js';

async function main() {
  try {
    // 1. Coordinadores/Adjuntos en la tabla coordinador
    const coords = await pool.query(`
      SELECT c.id_coordinador, c.id_usuario_rol, u.nombre, u.apellido, u.correo, c.activo
      FROM coordinador c
      JOIN usuario_rol ur ON c.id_usuario_rol = ur.id_usuario_rol
      JOIN usuario u ON ur.id_usuario = u.id_usuario
    `);
    console.log("Coordinadores registrados en tabla 'coordinador':", coords.rows.length);
    console.log(JSON.stringify(coords.rows, null, 2));

    // 2. Mapeados a profesores
    const mapped = await pool.query(`
      SELECT c.id_coordinador, p.id_profesor, u.nombre, u.apellido
      FROM coordinador c
      JOIN profesor p ON c.id_usuario_rol = p.id_usuario_rol
      JOIN usuario_rol ur ON c.id_usuario_rol = ur.id_usuario_rol
      JOIN usuario u ON ur.id_usuario = u.id_usuario
    `);
    console.log("\nCoordinadores mapeados a la tabla 'profesor':", mapped.rows.length);
    console.log(JSON.stringify(mapped.rows, null, 2));

    // 3. Cantidad de asistencias de coordinadores
    const asis = await pool.query(`
      SELECT COUNT(*) as count 
      FROM asistencia a
      WHERE a.id_profesor IN (
        SELECT p.id_profesor FROM coordinador c
        JOIN profesor p ON c.id_usuario_rol = p.id_usuario_rol
      )
    `);
    console.log("\nCantidad de asistencias registradas para coordinadores:", asis.rows[0].count);

    // 4. Cantidad de justificativos de coordinadores
    const just = await pool.query(`
      SELECT COUNT(*) as count 
      FROM justificativo j
      JOIN asistencia a ON j.id_asistencia = a.id_asistencia
      WHERE a.id_profesor IN (
        SELECT p.id_profesor FROM coordinador c
        JOIN profesor p ON c.id_usuario_rol = p.id_usuario_rol
      )
    `);
    console.log("\nCantidad de justificativos registrados para coordinadores:", just.rows[0].count);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
