import pool from '../config/db.js';

const Asignatura = {
  // Obtener todas las asignaturas
  async findAll() {
    const result = await pool.query(`
      SELECT a.*, c.nombre_carrera 
      FROM asignatura a
      JOIN carrera c ON a.id_carrera = c.id_carrera
      WHERE a.activo = true
      ORDER BY a.nombre_asignatura
    `);
    return result.rows;
  },

  // Obtener asignaturas por carrera
  async findByCarrera(carreraId) {
    const result = await pool.query(`
      SELECT * FROM asignatura 
      WHERE id_carrera = $1 AND activo = true
      ORDER BY nombre_asignatura
    `, [carreraId]);
    return result.rows;
  },

  // Obtener asignatura por ID
  async findById(id) {
    const result = await pool.query(`
      SELECT a.*, c.nombre_carrera 
      FROM asignatura a
      JOIN carrera c ON a.id_carrera = c.id_carrera
      WHERE a.id_asignatura = $1 AND a.activo = true
    `, [id]);
    return result.rows[0];
  },

  // Crear asignatura
  async create(nombre_asignatura, id_carrera) {
    const maxRes = await pool.query('SELECT COALESCE(MAX(id_asignatura), 0) + 1 as next_id FROM asignatura');
    const nextId = maxRes.rows[0].next_id;

    const result = await pool.query(`
      INSERT INTO asignatura (id_asignatura, nombre_asignatura, id_carrera, activo)
      VALUES ($1, $2, $3, true) RETURNING *
    `, [nextId, nombre_asignatura, id_carrera]);
    return result.rows[0];
  },

  // Actualizar asignatura
  async update(id, nombre_asignatura, id_carrera) {
    const result = await pool.query(`
      UPDATE asignatura 
      SET nombre_asignatura = $1, id_carrera = $2
      WHERE id_asignatura = $3 AND activo = true
      RETURNING *
    `, [nombre_asignatura, id_carrera, id]);
    return result.rows[0];
  },

  // Eliminar (desactivar) asignatura
  async delete(id) {
    const result = await pool.query(`
      UPDATE asignatura SET activo = false 
      WHERE id_asignatura = $1 RETURNING *
    `, [id]);
    return result.rows[0];
  },

  // Asignar profesor a asignatura
  async asignarProfesor(id_asignatura, id_profesor) {
    const maxRes = await pool.query('SELECT COALESCE(MAX(id_asignatura_profesor), 0) + 1 as next_id FROM asignatura_profesor');
    const nextId = maxRes.rows[0].next_id;

    const result = await pool.query(`
      INSERT INTO asignatura_profesor (id_asignatura_profesor, id_asignatura, id_profesor)
      VALUES ($1, $2, $3) RETURNING *
    `, [nextId, id_asignatura, id_profesor]);
    return result.rows[0];
  },

  // Obtener profesores de una asignatura
  async getProfesores(id_asignatura) {
    const result = await pool.query(`
      SELECT p.*, u.nombre, u.apellido
      FROM asignatura_profesor ap
      JOIN profesor p ON ap.id_profesor = p.id_profesor
      JOIN usuario_rol ur ON p.id_usuario_rol = ur.id_usuario_rol
      JOIN usuario u ON ur.id_usuario = u.id_usuario
      WHERE ap.id_asignatura = $1
    `, [id_asignatura]);
    return result.rows;
  }
};

export default Asignatura;