import pool from './src/config/db.js';

async function test() {
  try {
    const res = await pool.query("SELECT id_usuario, correo, rol FROM usuario WHERE rol::text ILIKE '%auditor%' OR rol::text ILIKE '%coordinador%' OR rol::text ILIKE '%adjunto%'");
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

test();
