import pool from './src/config/db.js';

async function test() {
  try {
    const res = await pool.query(`
      SELECT id_usuario, nombre, apellido, rol, typeof(rol) as rol_type
      FROM usuario
      LIMIT 10
    `);
    console.log("Usuarios in DB:");
    console.log(JSON.stringify(res.rows, null, 2));
    
    // Check if the time roles exist in DB
    const rolesRes = await pool.query(`
      SELECT * FROM categoria WHERE tip_id = 1
    `);
    console.log("\nRoles in DB Categoria table:");
    console.log(JSON.stringify(rolesRes.rows, null, 2));
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

test();
