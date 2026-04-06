const pool = require('../config/db');

const Rol = {
  async findAll() {
    const result = await pool.query('SELECT * FROM rol WHERE activo = true');
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query('SELECT * FROM rol WHERE id_rol = $1', [id]);
    return result.rows[0];
  },

  async findByName(nombre_rol) {
    const result = await pool.query('SELECT * FROM rol WHERE nombre_rol = $1', [nombre_rol]);
    return result.rows[0];
  }
};

module.exports = Rol;