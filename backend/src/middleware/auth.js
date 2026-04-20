import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado' });
  }
  
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'iujo_secret_key_2024');
    
    // Verificar si el token coincide con el guardado en la DB para prevenir sesiones concurrentes
    const userQuery = await pool.query(
      'SELECT session_token, activo FROM usuario WHERE id_usuario = $1',
      [verified.id]
    );

    if (userQuery.rows.length === 0 || !userQuery.rows[0].activo) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
    }

    if (userQuery.rows[0].session_token !== token) {
      return res.status(401).json({ error: 'Sesión invalidada. Alguien más inició sesión en este dispositivo o navegador.' });
    }

    req.user = verified;
    next();
  } catch (error) {
    console.error('Error en middleware auth:', error.message);
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

export default auth;