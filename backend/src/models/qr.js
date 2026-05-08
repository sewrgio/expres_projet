import pool from '../config/db.js';

const QR = {
  async generar(coordinadorId, descripcion = '', ubicacion = '', horasValidez = 2) {
    const maxRes = await pool.query('SELECT COALESCE(MAX(id_qr), 0) + 1 as next_id FROM qr');
    const nextId = maxRes.rows[0].next_id;
    const codigo = `QR_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    const result = await pool.query(
      `INSERT INTO qr (id_qr, id_coordinador, codigo_qr, fecha_creacion, activo, descripcion, ubicacion, fecha_expiracion)
       VALUES ($1, $2, $3, NOW(), true, $4, $5, NOW() + interval '${horasValidez} hours') RETURNING *`,
      [nextId, coordinadorId, codigo, descripcion, ubicacion]
    );
    return result.rows[0];
  },

  // Validar un QR dinámico (de coordinador) — devuelve info del QR y la carrera asociada
  async validar(codigo_qr) {
    const result = await pool.query(
      `SELECT q.*, c.id_carrera 
       FROM qr q
       LEFT JOIN coordinador c ON q.id_coordinador = c.id_coordinador
       WHERE q.codigo_qr = $1 
         AND q.activo = true 
         AND (q.fecha_expiracion IS NULL OR q.fecha_expiracion > NOW())`,
      [codigo_qr]
    );
    return result.rows[0];
  },

  // Validar un QR fijo (dirección, etc.) — devuelve info del QR fijo
  async validarFijo(codigo_qr) {
    const result = await pool.query(
      `SELECT * FROM qr_fijos 
       WHERE codigo = $1 AND activo = true`,
      [codigo_qr]
    );
    return result.rows[0];
  },

  // Validar cualquier tipo de QR (primero intenta dinámico, luego fijo)
  async validarCualquiera(codigo_qr) {
    // Primero intentar QR dinámico (de coordinador)
    const qrDinamico = await this.validar(codigo_qr);
    if (qrDinamico) {
      return { tipo: 'dinamico', qr: qrDinamico };
    }

    // Luego intentar QR fijo (dirección, etc.)
    const qrFijo = await this.validarFijo(codigo_qr);
    if (qrFijo) {
      return { tipo: 'fijo', qr: qrFijo };
    }

    return null;
  },

  async obtenerPorCoordinador(coordinadorId) {
    const result = await pool.query(
      `SELECT *, 
       CASE WHEN fecha_expiracion IS NOT NULL AND fecha_expiracion < NOW() THEN false ELSE true END as vigente
       FROM qr WHERE id_coordinador = $1 ORDER BY fecha_creacion DESC`,
      [coordinadorId]
    );
    return result.rows;
  },

  async desactivar(id_qr) {
    const result = await pool.query(
      `UPDATE qr SET activo = false WHERE id_qr = $1 RETURNING *`,
      [id_qr]
    );
    return result.rows[0];
  },

  async activar(id_qr) {
    const result = await pool.query(
      `UPDATE qr SET activo = true WHERE id_qr = $1 RETURNING *`,
      [id_qr]
    );
    return result.rows[0];
  },

  // ✅ Métodos para QR fijos desde base de datos
  async obtenerQRsEstaticos() {
    const result = await pool.query(
      `SELECT * FROM qr_fijos ORDER BY id_qr_fijo`
    );
    return result.rows;
  },

  async crearQRFijo(nombre, codigo) {
    const maxRes = await pool.query('SELECT COALESCE(MAX(id_qr_fijo), 0) + 1 as next_id FROM qr_fijos');
    const nextId = maxRes.rows[0].next_id;

    const result = await pool.query(
      `INSERT INTO qr_fijos (id_qr_fijo, nombre, codigo, activo) VALUES ($1, $2, $3, true) RETURNING *`,
      [nextId, nombre, codigo]
    );
    return result.rows[0];
  },

  async activarQRFijo(id_qr_fijo) {
    const result = await pool.query(
      `UPDATE qr_fijos SET activo = true WHERE id_qr_fijo = $1 RETURNING *`,
      [id_qr_fijo]
    );
    return result.rows[0];
  },

  async desactivarQRFijo(id_qr_fijo) {
    const result = await pool.query(
      `UPDATE qr_fijos SET activo = false WHERE id_qr_fijo = $1 RETURNING *`,
      [id_qr_fijo]
    );
    return result.rows[0];
  }
};

export default QR;