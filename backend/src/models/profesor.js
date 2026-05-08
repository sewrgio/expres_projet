import pool from '../config/db.js';

const Profesor = {
  async findAll() {
    const result = await pool.query(`
      SELECT p.*, u.nombre, u.apellido, u.correo, u.cedula, u.telefono,
             array_agg(DISTINCT c.nombre_carrera) as carreras
      FROM profesor p
      JOIN usuario_rol ur ON p.id_usuario_rol = ur.id_usuario_rol
      JOIN usuario u ON ur.id_usuario = u.id_usuario
      LEFT JOIN profesor_carrera pc ON p.id_profesor = pc.id_profesor
      LEFT JOIN carrera c ON pc.id_carrera = c.id_carrera
      GROUP BY p.id_profesor, u.id_usuario
    `);
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query(`
      SELECT p.*, u.nombre, u.apellido, u.correo, u.cedula, u.telefono
      FROM profesor p
      JOIN usuario_rol ur ON p.id_usuario_rol = ur.id_usuario_rol
      JOIN usuario u ON ur.id_usuario = u.id_usuario
      WHERE p.id_profesor = $1
    `, [id]);
    return result.rows[0];
  },

  async create(usuarioRolId) {
    const maxRes = await pool.query('SELECT COALESCE(MAX(id_profesor), 0) + 1 as next_id FROM profesor');
    const nextId = maxRes.rows[0].next_id;

    const result = await pool.query(`
      INSERT INTO profesor (id_profesor, id_usuario_rol)
      VALUES ($1, $2) RETURNING *
    `, [nextId, usuarioRolId]);
    return result.rows[0];
  }
};

export default Profesor;