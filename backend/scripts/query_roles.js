import pool from './src/config/db.js';

async function checkDb() {
  try {
    const roles = await pool.query('SELECT * FROM rol;');
    console.log('Roles:', roles.rows);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkDb();
