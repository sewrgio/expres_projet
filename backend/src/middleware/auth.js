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
    
    // Verificar sesión según plataforma
    const column = platform === 'app' ? 'session_token_app' : 'session_token';
    const userQuery = await pool.query(
      `SELECT ${column} as active_token, activo FROM usuario WHERE id_usuario = $1`,
      [verified.id]
    );

    if (userQuery.rows.length === 0 || !userQuery.rows[0].activo) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
    }

    if (userQuery.rows[0].active_token !== token) {
      return res.status(401).json({ error: 'Sesión cerrada. Se inició sesión en otro dispositivo.' });
    }

    req.user = verified;
    next();
  } catch (error) {
    console.error('Error en middleware auth:', error.message);
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

export default auth;