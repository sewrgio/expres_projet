import pool from '../config/db.js';

const Usuario = {
  // Busca al usuario y verifica sus perfiles en las tablas relacionadas
  async findByEmail(correo) {
    const result = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.apellido, u.cedula, u.correo, u.telefono, u.contrasena, u.activo,
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
  }
};

export default Usuario;