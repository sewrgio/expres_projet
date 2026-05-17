import pool from '../src/config/db.js';

async function check() {
  try {
    const result = await pool.query('SELECT * FROM asistencia ORDER BY id_asistencia DESC LIMIT 10');
    console.log('=== ULTIMAS 10 ASISTENCIAS ===');
    console.log(JSON.stringify(result.rows, null, 2));
    
    const countResult = await pool.query('SELECT COUNT(*) FROM asistencia');
    console.log('Total asistencias:', countResult.rows[0].count);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

check();
