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
      `SELECT session_token, session_token_app, activo FROM usuario WHERE id_usuario = $1`,
      [verified.id]
    );

    if (userQuery.rows.length === 0 || !userQuery.rows[0].activo) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
    }

    if (userQuery.rows[0].session_token !== token && userQuery.rows[0].session_token_app !== token) {
      return res.status(401).json({ error: 'Sesión cerrada. Se inició sesión en otro dispositivo.' });
    }

    // Obtener roles directamente de la tabla usuario_rol (fuente de verdad)
    const rolesQuery = await pool.query(
      `SELECT LOWER(c.nombre) as nombre_rol 
       FROM usuario_rol ur 
       JOIN categoria c ON ur.id_categoria = c.id_categoria 
       WHERE ur.id_usuario = $1 AND ur.activo = true AND c.tip_id = 1`,
      [verified.id]
    );
    const roles = rolesQuery.rows.map(r => r.nombre_rol.trim());
    
    const esAdjunto = roles.includes('adjunto coordinacion');
    
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

    let ids_carreras = coordinadorQuery.rows.map(c => c.id_carrera).filter(id => id !== null);

    // Si es adjunto y no tiene carreras asignadas como coordinador, buscar en sus carreras de profesor
    if (esAdjunto && ids_carreras.length === 0 && profesorQuery.rows.length > 0) {
      const profCarrQuery = await pool.query(
        `SELECT id_carrera FROM profesor_carrera WHERE id_profesor = $1 AND activo = true`,
        [profesorQuery.rows[0].id_profesor]
      );
      ids_carreras = profCarrQuery.rows.map(pc => pc.id_carrera);
    }

    let id_coordinador_final = coordinadorQuery.rows.length > 0 ? coordinadorQuery.rows[0].id_coordinador : null;

    // Si es adjunto y no tiene id_coordinador propio, tomar el del coordinador principal de su carrera
    if (esAdjunto && !id_coordinador_final && ids_carreras.length > 0) {
      const coordCarreraQuery = await pool.query(
        `SELECT id_coordinador FROM coordinador WHERE id_carrera = $1 LIMIT 1`,
        [ids_carreras[0]]
      );
      if (coordCarreraQuery.rows.length > 0) {
        id_coordinador_final = coordCarreraQuery.rows[0].id_coordinador;
      }
    }

    req.user = {
      ...verified,
      roles,
      esProfesor: profesorQuery.rows.length > 0,
      id_profesor: profesorQuery.rows[0]?.id_profesor,
      esCoordinador: coordinadorQuery.rows.length > 0 || esAdjunto,
      id_coordinador: id_coordinador_final,
      carreras: ids_carreras.map(id => ({ id })),
      ids_carreras: ids_carreras
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.error(`❌ Token expirado en ${req.path}: expiró en ${error.expiredAt}. Hora servidor: ${new Date().toISOString()}`);
    } else {
      console.error('❌ Error en middleware auth:', error.message);
    }
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

export default auth;