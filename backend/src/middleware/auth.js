import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  const platform = req.header('X-Platform') || 'web'; // La app Flutter enviará 'app'
  
  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado' });
  }
  
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'iujo_secret_key_2024');
    
    // Verificar sesión (permitir si el token coincide con web o app)
    const userQuery = await pool.query(
      `SELECT session_token, session_token_app, activo, rol as roles_json FROM usuario WHERE id_usuario = $1`,
      [verified.id]
    );

    if (userQuery.rows.length === 0 || !userQuery.rows[0].activo) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
    }

    if (userQuery.rows[0].session_token !== token && userQuery.rows[0].session_token_app !== token) {
      return res.status(401).json({ error: 'Sesión cerrada. Se inició sesión en otro dispositivo.' });
    }

    const roles = Array.isArray(userQuery.rows[0]?.roles_json) 
      ? userQuery.rows[0].roles_json 
      : [];
    
    // Verificar si es profesor
    const profesorQuery = await pool.query(
      `SELECT p.id_profesor 
       FROM profesor p 
       JOIN usuario_rol ur ON p.id_usuario_rol = ur.id_usuario_rol 
       WHERE ur.id_usuario = $1 AND ur.activo = true`,
      [verified.id]
    );
    
    // Verificar si es coordinador
    const coordinadorQuery = await pool.query(
      `SELECT c.id_coordinador, c.id_carrera 
       FROM coordinador c 
       JOIN usuario_rol ur ON c.id_usuario_rol = ur.id_usuario_rol 
       WHERE ur.id_usuario = $1 AND ur.activo = true`,
      [verified.id]
    );

    req.user = {
      ...verified,
      roles,
      esProfesor: profesorQuery.rows.length > 0,
      id_profesor: profesorQuery.rows[0]?.id_profesor,
      esCoordinador: coordinadorQuery.rows.length > 0,
      id_coordinador: coordinadorQuery.rows[0]?.id_coordinador,
      carreras: coordinadorQuery.rows.map(c => ({ id: c.id_carrera }))
    };
    next();
  } catch (error) {
    console.error('Error en middleware auth:', error.message);
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

export default auth;