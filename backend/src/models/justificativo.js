import pool from '../config/db.js';

const Justificativo = {
  // Crear solicitud
  async create(id_asistencia, motivo, documento_url = null) {
    const result = await pool.query(`
      INSERT INTO justificativo (id_asistencia, motivo, documento_url, estado, fecha_solicitud)
      VALUES ($1, $2, $3, 'pendiente', NOW()) RETURNING *
    `, [id_asistencia, motivo, documento_url]);
    return result.rows[0];
  },

  // ✅ NUEVO: Obtener todos los justificativos (para coordinador)
  async obtenerTodos() {
    const result = await pool.query(`
      SELECT j.*,
             u.nombre, u.apellido, u.correo, u.cedula,
             a.fecha_entrada, a.fecha_salida,
             asig.nombre_asignatura,
             c.nombre_carrera
      FROM justificativo j
      JOIN asistencia a ON j.id_asistencia = a.id_asistencia
      JOIN profesor p ON a.id_profesor = p.id_profesor
      JOIN usuario_rol ur ON p.id_usuario_rol = ur.id_usuario_rol
      JOIN usuario u ON ur.id_usuario = u.id_usuario
      LEFT JOIN profesor_carrera pc ON p.id_profesor = pc.id_profesor
      LEFT JOIN carrera c ON pc.id_carrera = c.id_carrera
      LEFT JOIN horario h ON a.id_horario = h.id_horario
      LEFT JOIN asignatura_profesor ap ON h.id_asignatura_profesor = ap.id_asignatura_profesor
      LEFT JOIN asignatura asig ON ap.id_asignatura = asig.id_asignatura
      ORDER BY j.fecha_solicitud DESC
    `);
    return result.rows;
  },

  // ✅ NUEVO: Obtener justificativos SOLO de coordinadores (para auditor)
  async obtenerDeCoordinadores() {
    const result = await pool.query(`
      SELECT j.*,
             u.nombre, u.apellido, u.correo, u.cedula,
             a.fecha_entrada, a.fecha_salida,
             asig.nombre_asignatura,
             c.nombre_carrera
      FROM justificativo j
      JOIN asistencia a ON j.id_asistencia = a.id_asistencia
      JOIN profesor p ON a.id_profesor = p.id_profesor
      JOIN usuario_rol ur ON p.id_usuario_rol = ur.id_usuario_rol
      JOIN usuario u ON ur.id_usuario = u.id_usuario
      LEFT JOIN profesor_carrera pc ON p.id_profesor = pc.id_profesor
      LEFT JOIN carrera c ON pc.id_carrera = c.id_carrera
      LEFT JOIN horario h ON a.id_horario = h.id_horario
      LEFT JOIN asignatura_profesor ap ON h.id_asignatura_profesor = ap.id_asignatura_profesor
      LEFT JOIN asignatura asig ON ap.id_asignatura = asig.id_asignatura
      WHERE EXISTS (
        SELECT 1 FROM coordinador coord
        JOIN usuario_rol ur2 ON coord.id_usuario_rol = ur2.id_usuario_rol
        WHERE ur2.id_usuario = u.id_usuario
      )
      ORDER BY j.fecha_solicitud DESC
    `);
    return result.rows;
  },

  // Obtener justificativos por profesor
  async findByProfesor(profesorId) {
    const result = await pool.query(`
      SELECT j.*, a.fecha_entrada, a.fecha_salida,
             h.dia_semana, asig.nombre_asignatura
      FROM justificativo j
      JOIN asistencia a ON j.id_asistencia = a.id_asistencia
      LEFT JOIN horario h ON a.id_horario = h.id_horario
      LEFT JOIN asignatura_profesor ap ON h.id_asignatura_profesor = ap.id_asignatura_profesor
      LEFT JOIN asignatura asig ON ap.id_asignatura = asig.id_asignatura
      WHERE a.id_profesor = $1
      ORDER BY j.fecha_solicitud DESC
    `, [profesorId]);
    return result.rows;
  },

  // Obtener justificativos por coordinador (de su carrera)
  async findByCoordinador(coordinadorId) {
    const result = await pool.query(`
      SELECT j.*, u.nombre, u.apellido, u.cedula,
             a.fecha_entrada, asig.nombre_asignatura
      FROM justificativo j
      JOIN asistencia a ON j.id_asistencia = a.id_asistencia
      JOIN profesor p ON a.id_profesor = p.id_profesor
      JOIN usuario_rol ur ON p.id_usuario_rol = ur.id_usuario_rol
      JOIN usuario u ON ur.id_usuario = u.id_usuario
      LEFT JOIN horario h ON a.id_horario = h.id_horario
      LEFT JOIN asignatura_profesor ap ON h.id_asignatura_profesor = ap.id_asignatura_profesor
      LEFT JOIN asignatura asig ON ap.id_asignatura = asig.id_asignatura
      JOIN profesor_carrera pc ON p.id_profesor = pc.id_profesor
      WHERE pc.id_carrera = (SELECT id_carrera FROM coordinador WHERE id_coordinador = $1)
      ORDER BY j.fecha_solicitud DESC
    `, [coordinadorId]);
    return result.rows;
  },

  // Aprobar justificativo
  async aprobar(id, observaciones = null) {
    const result = await pool.query(`
      UPDATE justificativo 
      SET estado = 'aprobado', fecha_respuesta = NOW(), observaciones_coordinador = $2
      WHERE id_justificativo = $1 RETURNING *
    `, [id, observaciones]);
    return result.rows[0];
  },

  // Rechazar justificativo
  async rechazar(id, observaciones = null) {
    const result = await pool.query(`
      UPDATE justificativo 
      SET estado = 'rechazado', fecha_respuesta = NOW(), observaciones_coordinador = $2
      WHERE id_justificativo = $1 RETURNING *
    `, [id, observaciones]);
    return result.rows[0];
  }
};

export default Justificativo;