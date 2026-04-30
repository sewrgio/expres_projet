import pool from '../config/db.js';

const Usuario = {
  // Busca al usuario y verifica sus perfiles en las tablas relacionadas
  async findByEmail(correo, includeInactive = true) {
    let query = `
      SELECT u.id_usuario, u.nombre, u.apellido, u.cedula, u.correo, u.telefono, u.contrasena, u.activo,
        u.email_verificado, u.codigo_verificacion, u.codigo_recuperacion, u.session_token, u.session_token_app, u.fecha_codigo_verificacion,
        (CASE WHEN p.id_profesor IS NOT NULL THEN true ELSE false END) as es_profesor,
        (CASE WHEN c.id_coordinador IS NOT NULL THEN true ELSE false END) as es_coordinador
       FROM usuario u
       LEFT JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario AND ur.activo = true
       LEFT JOIN profesor p ON ur.id_usuario_rol = p.id_usuario_rol
       LEFT JOIN coordinador c ON ur.id_usuario_rol = c.id_usuario_rol
       WHERE u.correo = $1`;
    
    if (!includeInactive) {
      query += ` AND u.activo = true`;
    }
    
    const result = await pool.query(query, [correo]);
    return result.rows[0];
  },

  async verifyEmail(token) {
    // Verificar si el token existe y si no ha expirado (24 horas)
    const result = await pool.query(
      `UPDATE usuario 
       SET email_verificado = true, codigo_verificacion = NULL, fecha_codigo_verificacion = NULL
       WHERE codigo_verificacion = $1 
       AND (fecha_codigo_verificacion > NOW() - INTERVAL '24 hours')
       RETURNING id_usuario`,
      [token]
    );
    return result.rows[0];
  },

  async updateSessionToken(id_usuario, token, platform) {
    // Sanitización básica para la columna (white-list)
    const column = platform === 'app' ? 'session_token_app' : 'session_token';
    
    // Al usar una columna dinámica, debemos ser cuidadosos. 
    // Como 'column' solo puede ser uno de dos valores fijos, es seguro.
    const query = `UPDATE usuario SET ${column} = $1 WHERE id_usuario = $2`;
    console.log('Ejecutando query:', query, 'con token length:', token.length, 'y usuario ID:', id_usuario);
    await pool.query(query, [token, id_usuario]);
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