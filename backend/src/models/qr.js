import pool from '../config/db.js';

const QR = {
  async generar(coordinadorId, descripcion = '', ubicacion = '') {
    const codigo = `QR_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    const result = await pool.query(
      `INSERT INTO qr (id_coordinador, codigo_qr, fecha_creacion, activo, descripcion, ubicacion)
       VALUES ($1, $2, NOW(), true, $3, $4) RETURNING *`,
      [coordinadorId, codigo, descripcion, ubicacion]
    );
    return result.rows[0];
  },

  async validar(codigo_qr) {
    const result = await pool.query(
      `SELECT q.*, c.id_carrera 
       FROM qr q
       JOIN coordinador c ON q.id_coordinador = c.id_coordinador
       WHERE q.codigo_qr = $1 AND q.activo = true`,
      [codigo_qr]
    );
    return result.rows[0];
  },

  async obtenerPorCoordinador(coordinadorId) {
    const result = await pool.query(
      `SELECT * FROM qr WHERE id_coordinador = $1 AND activo = true`,
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

  async obtenerQRsEstaticos() {
    const qrEstaticos = [
      { nombre: 'Informática', codigo: 'COORD_INFORMATICA' },
      { nombre: 'Educación', codigo: 'COORD_EDUCACION' },
      { nombre: 'Electrónica', codigo: 'COORD_ELECTRONICA' },
      { nombre: 'Contaduría', codigo: 'COORD_CONTADURIA' },
      { nombre: 'Dirección', codigo: 'COORD_DIRECCION' },
      { nombre: 'Administración de Empresas', codigo: 'COORD_ADMIN_EMPRESAS' }
    ];
    return qrEstaticos;
  }
};

export default QR;