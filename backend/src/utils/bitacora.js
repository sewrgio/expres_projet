import pool from '../config/db.js';

/**
 * Registra una acción de auditoría en la tabla bitacora_logs.
 * 
 * @param {number} idUsuario ID del usuario que realiza la acción (por ejemplo, auditor o coordinador)
 * @param {string} accion Nombre corto e identificable de la acción realizada (ej: "CAMBIO_ROL", "GENERAR_QR")
 * @param {string} descripcionDetallada Detalles ricos: descripción de la acción, qué afectó, y qué efecto dejó.
 */
export async function registrarBitacora(idUsuario, accion, descripcionDetallada) {
  try {
    await pool.query(
      `INSERT INTO bitacora_logs (id_usuario, accion, detalles, fecha) 
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [idUsuario, accion, descripcionDetallada]
    );
  } catch (error) {
    console.error('❌ Error al intentar registrar entrada en la bitácora:', error);
  }
}
