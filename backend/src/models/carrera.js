import pool from '../config/db.js';

const Carrera = {
  async findAll() {
    const result = await pool.query('SELECT * FROM carrera WHERE activo = true ORDER BY id_carrera');
    return result.rows;
  },

  async findAllIncluyendoInactivos() {
    const result = await pool.query('SELECT * FROM carrera ORDER BY id_carrera');
    return result.rows;
  },

  async create(nombre_carrera) {
    const result = await pool.query(
      'INSERT INTO carrera (nombre_carrera, activo) VALUES ($1, true) RETURNING *',
      [nombre_carrera]
    );
    return result.rows[0];
  },

  // ✅ MODIFICADO: ahora permite actualizar nombre y activo
  async update(id, data) {
    const { nombre_carrera, activo } = data;
    const result = await pool.query(
      'UPDATE carrera SET nombre_carrera = $1, activo = $2 WHERE id_carrera = $3 RETURNING *',
      [nombre_carrera, activo !== false, id]
    );
    return result.rows[0];
  },

  async delete(id) {
    const result = await pool.query(
      'UPDATE carrera SET activo = false WHERE id_carrera = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }
};

export default Carrera;