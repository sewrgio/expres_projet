import pool from './src/config/db.js';
try {
  const res = await pool.query('SELECT * FROM categoria');
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
} catch (e) {
  console.error(e);
  process.exit(1);
}
