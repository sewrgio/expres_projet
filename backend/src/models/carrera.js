import pool from '../config/db.js';

const Carrera = {
  async findAll() {
    const result = await pool.query('SELECT * FROM carrera WHERE activo = true');
    return result.rows;
  },

  async create(nombre_carrera) {
    const result = await pool.query(
      'INSERT INTO carrera (nombre_carrera, activo) VALUES ($1, true) RETURNING *',
      [nombre_carrera]
    );
    return result.rows[0];
  },

  async update(id, nombre_carrera) {
    const result = await pool.query(
      'UPDATE carrera SET nombre_carrera = $1 WHERE id_carrera = $2 RETURNING *',
      [nombre_carrera, id]
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