import pool from '../config/db.js';

const Asistencia = {
  async registrarEntrada(profesorId, qrId, observaciones = '') {
    const hoy = new Date().toISOString().split('T')[0];
    const existente = await pool.query(
      `SELECT * FROM asistencia 
       WHERE id_profesor = $1 AND DATE(fecha_entrada) = $2 AND fecha_salida IS NULL`,
      [profesorId, hoy]
    );
    
    if (existente.rows.length > 0) {
      throw new Error('Ya tiene una entrada activa. Debe registrar la salida primero.');
    }
    
    const result = await pool.query(
      `INSERT INTO asistencia (id_profesor, id_qr, fecha_entrada, observaciones)
       VALUES ($1, $2, NOW(), $3) RETURNING *`,
      [profesorId, qrId, observaciones]
    );
    return result.rows[0];
  },

  async registrarSalida(profesorId, observaciones = '') {
    const hoy = new Date().toISOString().split('T')[0];
    const result = await pool.query(
      `UPDATE asistencia 
       SET fecha_salida = NOW(), 
           observaciones_salida = $2
       WHERE id_profesor = $1 
         AND DATE(fecha_entrada) = $3 
         AND fecha_salida IS NULL
       RETURNING *`,
      [profesorId, observaciones, hoy]
    );
    
    if (result.rows.length === 0) {
      throw new Error('No hay una entrada activa para registrar salida');
    }
    return result.rows[0];
  },

  async verificarEstado(profesorId) {
    const hoy = new Date().toISOString().split('T')[0];
    const result = await pool.query(
      `SELECT * FROM asistencia 
       WHERE id_profesor = $1 
         AND DATE(fecha_entrada) = $2 
         AND fecha_salida IS NULL`,
      [profesorId, hoy]
    );
    return {
      dentro: result.rows.length > 0,
      asistenciaActual: result.rows[0] || null
    };
  },

  async obtenerAsistenciasHoy(profesorId) {
    const hoy = new Date().toISOString().split('T')[0];
    const result = await pool.query(
      `SELECT a.*, q.descripcion as ubicacion
       FROM asistencia a
       LEFT JOIN qr q ON a.id_qr = q.id_qr
       WHERE a.id_profesor = $1 AND DATE(a.fecha_entrada) = $2
       ORDER BY a.fecha_entrada DESC`,
      [profesorId, hoy]
    );
    return result.rows;
  },

  async obtenerHistorial(profesorId, limite = 30) {
    const result = await pool.query(
      `SELECT a.*, q.descripcion as ubicacion,
              EXTRACT(HOUR FROM (a.fecha_salida - a.fecha_entrada)) as horas_trabajadas
       FROM asistencia a
       LEFT JOIN qr q ON a.id_qr = q.id_qr
       WHERE a.id_profesor = $1
       ORDER BY a.fecha_entrada DESC
       LIMIT $2`,
      [profesorId, limite]
    );
    return result.rows;
  },

  // 👇 NUEVO MÉTODO: Obtener todas las asistencias (para coordinador)
  async obtenerTodas(limite = 100) {
    const result = await pool.query(
      `SELECT a.*, 
              u.nombre, u.apellido, u.correo,
              q.descripcion as ubicacion,
              EXTRACT(HOUR FROM (a.fecha_salida - a.fecha_entrada)) as horas_trabajadas
       FROM asistencia a
       JOIN profesor p ON a.id_profesor = p.id_profesor
       JOIN usuario_rol ur ON p.id_usuario_rol = ur.id_usuario_rol
       JOIN usuario u ON ur.id_usuario = u.id_usuario
       LEFT JOIN qr q ON a.id_qr = q.id_qr
       ORDER BY a.fecha_entrada DESC
       LIMIT $1`,
      [limite]
    );
    return result.rows;
  }
};

export default Asistencia;