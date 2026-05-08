import pool from '../config/db.js';

const Asistencia = {
  // Registrar entrada — puede ser con QR dinámico (id_qr) o sin él (QR fijo)
  async registrarEntrada(profesorId, qrId = null) {
    const hoy = new Date().toISOString().split('T')[0];
    const existente = await pool.query(
      `SELECT * FROM asistencia 
       WHERE id_profesor = $1 AND DATE(fecha_entrada) = $2 AND fecha_salida IS NULL`,
      [profesorId, hoy]
    );
    
    if (existente.rows.length > 0) {
      throw new Error('Ya tiene una entrada activa. Debe registrar la salida primero.');
    }
    
    // Obtener el siguiente ID manualmente
    const maxRes = await pool.query('SELECT COALESCE(MAX(id_asistencia), 0) + 1 as next_id FROM asistencia');
    const nextId = maxRes.rows[0].next_id;

    const result = await pool.query(
      `INSERT INTO asistencia (id_asistencia, id_profesor, id_qr, fecha_entrada)
       VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [nextId, profesorId, qrId]
    );
    return result.rows[0];
  },

  async registrarSalida(profesorId) {
    const hoy = new Date().toISOString().split('T')[0];
    const existente = await pool.query(
      `SELECT id_asistencia FROM asistencia 
       WHERE id_profesor = $1 AND DATE(fecha_entrada) = $2 AND fecha_salida IS NULL
       ORDER BY fecha_entrada DESC LIMIT 1`,
      [profesorId, hoy]
    );

    if (existente.rows.length === 0) {
      throw new Error('No tiene una entrada activa hoy para registrar salida.');
    }

    const idAsistencia = existente.rows[0].id_asistencia;
    const result = await pool.query(
      `UPDATE asistencia SET fecha_salida = NOW() WHERE id_asistencia = $1 RETURNING *`,
      [idAsistencia]
    );
    return result.rows[0];
  },


  async obtenerAsistenciasHoy(profesorId) {
    const hoy = new Date().toISOString().split('T')[0];
    const result = await pool.query(
      `SELECT a.*, u.nombre, u.apellido, q.descripcion as ubicacion
       FROM asistencia a
       JOIN profesor p ON a.id_profesor = p.id_profesor
       JOIN usuario_rol ur ON p.id_usuario_rol = ur.id_usuario_rol
       JOIN usuario u ON ur.id_usuario = u.id_usuario
       LEFT JOIN qr q ON a.id_qr = q.id_qr
       WHERE a.id_profesor = $1 AND DATE(a.fecha_entrada) = $2
       ORDER BY a.fecha_entrada DESC`,
      [profesorId, hoy]
    );
    return result.rows;
  },

  async obtenerHistorial(profesorId, limite = 30) {
    const result = await pool.query(
      `SELECT a.*, u.nombre, u.apellido, q.descripcion as ubicacion,
              EXTRACT(HOUR FROM (a.fecha_salida - a.fecha_entrada)) as horas_trabajadas
       FROM asistencia a
       JOIN profesor p ON a.id_profesor = p.id_profesor
       JOIN usuario_rol ur ON p.id_usuario_rol = ur.id_usuario_rol
       JOIN usuario u ON ur.id_usuario = u.id_usuario
       LEFT JOIN qr q ON a.id_qr = q.id_qr
       WHERE a.id_profesor = $1
       ORDER BY a.fecha_entrada DESC
       LIMIT $2`,
      [profesorId, limite]
    );
    return result.rows;
  },

  async verificarEstado(profesorId) {
    const hoy = new Date().toISOString().split('T')[0];
    const result = await pool.query(
      `SELECT * FROM asistencia
       WHERE id_profesor = $1 AND DATE(fecha_entrada) = $2
       ORDER BY fecha_entrada DESC
       LIMIT 1`,
      [profesorId, hoy]
    );

    if (result.rows.length === 0) {
      return {
        dentro: false,
        asistenciaActual: null
      };
    }

    const asistencia = result.rows[0];
    return {
      dentro: asistencia.fecha_salida === null,
      asistenciaActual: asistencia
    };
  },

  // Obtener inasistencias del profesor (asistencias sin salida o sin entrada en días laborales)
  async obtenerInasistencias(profesorId) {
    const result = await pool.query(
      `SELECT a.*, u.nombre, u.apellido, q.descripcion as ubicacion,
              asig.nombre_asignatura as materia,
              TO_CHAR(a.fecha_entrada, 'DD/MM/YYYY') as fecha
       FROM asistencia a
       JOIN profesor p ON a.id_profesor = p.id_profesor
       JOIN usuario_rol ur ON p.id_usuario_rol = ur.id_usuario_rol
       JOIN usuario u ON ur.id_usuario = u.id_usuario
       LEFT JOIN qr q ON a.id_qr = q.id_qr
       LEFT JOIN horario h ON a.id_horario = h.id_horario
       LEFT JOIN asignatura_profesor ap ON h.id_asignatura_profesor = ap.id_asignatura_profesor
       LEFT JOIN asignatura asig ON ap.id_asignatura = asig.id_asignatura
       WHERE a.id_profesor = $1 
         AND a.fecha_salida IS NULL
         AND DATE(a.fecha_entrada) < CURRENT_DATE
       ORDER BY a.fecha_entrada DESC
       LIMIT 100`,
      [profesorId]
    );
    return result.rows;
  },

  // Obtener todas las asistencias (para coordinador)
  async obtenerTodas(limite = 5000) {
    const result = await pool.query(
      `SELECT *, 
              EXTRACT(HOUR FROM (fecha_salida - fecha_entrada)) as horas_reloj
       FROM v_reporte_asistencias
       ORDER BY fecha_entrada DESC
       LIMIT $1`,
      [limite]
    );
    return result.rows;
  },

  // Obtener la dedicación del profesor (TIEMPO_COMPLETO, etc.)
  async obtenerDedicacionProfesor(profesorId) {
    const result = await pool.query(
      `SELECT pc.dedicacion, pc.id_carrera, c.nombre_carrera
       FROM profesor_carrera pc
       JOIN carrera c ON pc.id_carrera = c.id_carrera
       WHERE pc.id_profesor = $1 AND pc.activo = true
       LIMIT 1`,
      [profesorId]
    );
    return result.rows[0] || null;
  }
};

export default Asistencia;