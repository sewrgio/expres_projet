import pool from '../config/db.js';

const Horario = {
  // Obtener todos los horarios
  async findAll() {
    const result = await pool.query(`
      SELECT h.*, a.nombre_asignatura, pr.id_profesor, u.nombre, u.apellido,
             c.id_carrera, c.nombre_carrera
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
    const maxRes = await pool.query('SELECT COALESCE(MAX(id_horario), 0) + 1 as next_id FROM horario');
    const nextId = maxRes.rows[0].next_id;

    const result = await pool.query(`
      INSERT INTO horario (id_horario, id_asignatura_profesor, dia_semana, hora_inicio, hora_fin, aula)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [nextId, id_asignatura_profesor, dia_semana, hora_inicio, hora_fin, aula]);
    return result.rows[0];
  },

  // Eliminar horario
  async delete(id) {
    const result = await pool.query('DELETE FROM horario WHERE id_horario = $1 RETURNING *', [id]);
    return result.rows[0];
  },

  // Verificar si hay conflicto de horario
  async verificarConflicto(id_asignatura_profesor, dia_semana, hora_inicio, hora_fin, excluirId = null) {
    const apResult = await pool.query(
      'SELECT id_profesor FROM asignatura_profesor WHERE id_asignatura_profesor = $1',
      [id_asignatura_profesor]
    );
    
    if (apResult.rows.length === 0) return { tieneConflicto: false };
    
    const id_profesor = apResult.rows[0].id_profesor;
    
    let query = `
      SELECT h.*, a.nombre_asignatura
      FROM horario h
      JOIN asignatura_profesor ap ON h.id_asignatura_profesor = ap.id_asignatura_profesor
      JOIN asignatura a ON ap.id_asignatura = a.id_asignatura
      WHERE ap.id_profesor = $1
        AND h.dia_semana = $2
        AND (
          (h.hora_inicio <= $3 AND h.hora_fin > $3) OR
          (h.hora_inicio < $4 AND h.hora_fin >= $4) OR
          (h.hora_inicio >= $3 AND h.hora_fin <= $4)
        )
    `;
    const params = [id_profesor, dia_semana, hora_inicio, hora_fin];
    
    if (excluirId) {
      query += ' AND h.id_horario != $5';
      params.push(excluirId);
    }
    
    const result = await pool.query(query, params);
    
    if (result.rows.length > 0) {
      const conflicto = result.rows[0];
      return {
        tieneConflicto: true,
        mensaje: `El profesor ya tiene asignada la materia "${conflicto.nombre_asignatura}" el ${dia_semana} de ${conflicto.hora_inicio.substring(0,5)} a ${conflicto.hora_fin.substring(0,5)}`,
        horarioConflicto: conflicto
      };
    }
    
    return { tieneConflicto: false };
  },

  // Obtener asignaturas con profesores
  async getAsignaturasConProfesores() {
    const result = await pool.query(`
      SELECT ap.id_asignatura_profesor, a.nombre_asignatura, 
             p.id_profesor, u.nombre, u.apellido, c.id_carrera, c.nombre_carrera
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