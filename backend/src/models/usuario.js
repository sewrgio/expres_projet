import pool from '../config/db.js';

const Usuario = {
  // Busca al usuario y verifica sus perfiles en las tablas relacionadas
  async findByEmail(correo) {
    const result = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.apellido, u.cedula, u.correo, u.telefono, u.contrasena, u.activo,
        u.email_verificado, u.codigo_verificacion, u.codigo_recuperacion, u.session_token, u.session_token_app,
        (CASE WHEN p.id_profesor IS NOT NULL THEN true ELSE false END) as es_profesor,
        (CASE WHEN c.id_coordinador IS NOT NULL THEN true ELSE false END) as es_coordinador
       FROM usuario u
       LEFT JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario AND ur.activo = true
       LEFT JOIN profesor p ON ur.id_usuario_rol = p.id_usuario_rol
       LEFT JOIN coordinador c ON ur.id_usuario_rol = c.id_usuario_rol
       WHERE u.correo = $1 AND u.activo = true`,
      [correo]
    );
    return result.rows[0];
  },

  // platform: 'web' o 'app'
  async updateSessionToken(id, token, platform = 'web') {
    const column = platform === 'app' ? 'session_token_app' : 'session_token';
    await pool.query(
      `UPDATE usuario SET ${column} = $1 WHERE id_usuario = $2`,
      [token, id]
    );
  },

  async verifyEmail(token) {
    const result = await pool.query(
      'UPDATE usuario SET email_verificado = true, codigo_verificacion = NULL WHERE codigo_verificacion = $1 RETURNING id_usuario',
      [token]
    );
    return result.rows[0];
  },

  async setRecoveryCode(email, code) {
    await pool.query(
      'UPDATE usuario SET codigo_recuperacion = $1 WHERE correo = $2',
      [code, email]
    );
  },

  async validateRecoveryCode(email, code) {
    const result = await pool.query(
      'SELECT id_usuario FROM usuario WHERE correo = $1 AND codigo_recuperacion = $2',
      [email, code]
    );
    return result.rows[0];
  },

  async updatePassword(email, hashedPassword) {
    await pool.query(
      'UPDATE usuario SET contrasena = $1, codigo_recuperacion = NULL WHERE correo = $2',
      [hashedPassword, email]
    );
  }
};

export default Usuario;