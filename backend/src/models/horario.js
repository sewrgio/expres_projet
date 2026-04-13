import pool from '../config/db.js';

const Horario = {
  // Obtener todos los horarios
  async findAll() {
    const result = await pool.query(`
      SELECT h.*, a.nombre_asignatura, pr.id_profesor, u.nombre, u.apellido,
             c.nombre_carrera
      FROM horario h
      JOIN asignatura_profesor ap ON h.id_asignatura_profesor = ap.id_asignatura_profesor
      JOIN asignatura a ON ap.id_asignatura = a.id_asignatura
      JOIN profesor pr ON ap.id_profesor = pr.id_profesor
      JOIN usuario_rol ur ON pr.id_usuario_rol = ur.id_usuario_rol
      JOIN usuario u ON ur.id_usuario = u.id_usuario
      JOIN carrera c ON a.id_carrera = c.id_carrera
      ORDER BY h.dia_semana, h.hora_inicio
    `);
    return result.rows;
  },

  // Obtener horarios por profesor
  async findByProfesor(profesorId) {
    const result = await pool.query(`
      SELECT h.*, a.nombre_asignatura, c.nombre_carrera
      FROM horario h
      JOIN asignatura_profesor ap ON h.id_asignatura_profesor = ap.id_asignatura_profesor
      JOIN asignatura a ON ap.id_asignatura = a.id_asignatura
      JOIN carrera c ON a.id_carrera = c.id_carrera
      WHERE ap.id_profesor = $1
      ORDER BY h.dia_semana, h.hora_inicio
    `, [profesorId]);
    return result.rows;
  },

  // Crear horario
  async create(id_asignatura_profesor, dia_semana, hora_inicio, hora_fin, aula) {
    const result = await pool.query(`
      INSERT INTO horario (id_asignatura_profesor, dia_semana, hora_inicio, hora_fin, aula)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [id_asignatura_profesor, dia_semana, hora_inicio, hora_fin, aula]);
    return result.rows[0];
  },

  // Eliminar horario
  async delete(id) {
    const result = await pool.query('DELETE FROM horario WHERE id_horario = $1 RETURNING *', [id]);
    return result.rows[0];
  },

  // Obtener asignaturas con profesores
  async getAsignaturasConProfesores() {
    const result = await pool.query(`
      SELECT ap.id_asignatura_profesor, a.nombre_asignatura, 
             p.id_profesor, u.nombre, u.apellido, c.nombre_carrera
      FROM asignatura_profesor ap
      JOIN asignatura a ON ap.id_asignatura = a.id_asignatura
      JOIN profesor p ON ap.id_profesor = p.id_profesor
      JOIN usuario_rol ur ON p.id_usuario_rol = ur.id_usuario_rol
      JOIN usuario u ON ur.id_usuario = u.id_usuario
      JOIN carrera c ON a.id_carrera = c.id_carrera
      WHERE a.activo = true
    `);
    return result.rows;
  }
};

export default Horario;