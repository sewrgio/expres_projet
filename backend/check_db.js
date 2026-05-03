import dotenv from 'dotenv';
dotenv.config();
import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, ssl: false });

async function check() {
  // Check if col exists
  const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='usuario' AND column_name='rol'");
  console.log('Columna rol:', cols.rows);

  if (cols.rows.length === 0) {
    console.log('Agregando columna rol jsonb...');
    await pool.query("ALTER TABLE usuario ADD COLUMN rol jsonb");
    console.log('Columna agregada');
  }

  // Check sample data
  const sample = await pool.query("SELECT id_usuario, nombre, apellido, rol FROM usuario WHERE rol IS NOT NULL LIMIT 10");
  console.log('Con rol:', sample.rows);

  const nulls = await pool.query("SELECT count(*) FROM usuario WHERE rol IS NULL");
  console.log('Sin rol:', nulls.rows[0].count);

  pool.end();
}
check();
