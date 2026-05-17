import pool from './src/config/db.js';
async function check() {
  try {
    const res = await pool.query('SELECT codigo_qr, activo, fecha_expiracion, NOW() as db_now, fecha_expiracion > NOW() as vigente FROM qr ORDER BY id_qr DESC LIMIT 5');
    console.table(res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
check();
