import pool from './src/config/db.js';

async function test() {
  try {
    const res = await pool.query(`
      SELECT c.*, ur.id_usuario, cat.nombre as rol_nombre
      FROM coordinador c
      JOIN usuario_rol ur ON c.id_usuario_rol = ur.id_usuario_rol
      JOIN categoria cat ON ur.id_categoria = cat.id_categoria
      WHERE ur.id_usuario = 5
    `);
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

test();
