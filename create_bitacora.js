import pool from './backend/src/config/db.js';
async function createTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bitacora_logs (
        id SERIAL PRIMARY KEY,
        id_usuario INTEGER REFERENCES usuario(id_usuario),
        accion VARCHAR(255) NOT NULL,
        detalles TEXT,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Tabla bitacora_logs creada con éxito.");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}
createTable();
