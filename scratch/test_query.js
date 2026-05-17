import pool from '../backend/src/config/db.js';

async function test() {
  try {
    const ids_carreras = [1]; // Simular un ID de carrera
    const query = `
      SELECT p.id_profesor, u.nombre, u.apellido, u.correo, pc.id_carrera
      FROM profesor p
      JOIN usuario_rol ur ON p.id_usuario_rol = ur.id_usuario_rol
      JOIN usuario u ON ur.id_usuario = u.id_usuario
      LEFT JOIN profesor_carrera pc ON p.id_profesor = pc.id_profesor AND pc.activo = true
      WHERE u.activo = true
      AND (EXISTS (
        SELECT 1 FROM profesor_carrera pc2
        WHERE pc2.id_profesor = p.id_profesor AND pc2.id_carrera = ANY($1::int[]) AND pc2.activo = true
      ) OR EXISTS (
        SELECT 1 FROM coordinador c WHERE c.id_usuario_rol = ur.id_usuario_rol AND c.id_carrera = ANY($1::int[])
      ))
    `;
    const result = await pool.query(query, [ids_carreras]);
    console.log('Query successful, rows:', result.rows.length);
    process.exit(0);
  } catch (err) {
    console.error('Query failed:', err);
    process.exit(1);
  }
}

test();
