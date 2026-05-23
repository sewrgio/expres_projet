import pool from './src/config/db.js';
import fs from 'fs';

async function test() {
  try {
    const res = await pool.query("SELECT id_usuario, nombre, apellido, cedula, correo, activo, rol FROM usuario ORDER BY id_usuario");
    fs.writeFileSync('usuarios_db.json', JSON.stringify(res.rows, null, 2));
    console.log("SUCCESS: wrote " + res.rows.length + " users to usuarios_db.json");
    process.exit(0);
  } catch (e) {
    fs.writeFileSync('usuarios_db.json', JSON.stringify({ error: e.message, stack: e.stack }, null, 2));
    console.error(e);
    process.exit(1);
  }
}

test();
