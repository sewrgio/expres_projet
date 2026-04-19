import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Usuario from '../models/usuario.js';
import pool from '../config/db.js';

const router = express.Router();

// --- REGISTRO ---
router.post('/register', async (req, res) => {
  const { nombre, apellido, cedula, correo, telefono, password, rol, carrera_id } = req.body;

  let client;

  try {
    client = await pool.connect();

    const existe = await Usuario.findByEmail(correo);
    if (existe) {
      return res.status(400).json({ error: 'El correo ya existe' });
    }

    await client.query('BEGIN');

    const hashedPassword = await bcrypt.hash(password, 10);

    const userRes = await client.query(
      `INSERT INTO usuario (nombre, apellido, cedula, correo, telefono, contrasena, activo)
       VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id_usuario`,
      [nombre, apellido, cedula, correo, telefono, hashedPassword]
    );
    const userId = userRes.rows[0].id_usuario;

    const rolNombre = rol || 'profesor';

    const rolRes = await client.query(
      `INSERT INTO usuario_rol (id_usuario, id_rol, fecha_desde, activo)
       VALUES ($1, (SELECT id_rol FROM rol WHERE nombre_rol = $2), CURRENT_DATE, true)
       RETURNING id_usuario_rol`,
      [userId, rolNombre]
    );
    const userRolId = rolRes.rows[0].id_usuario_rol;

    await client.query(
      `INSERT INTO profesor (id_profesor, id_usuario_rol, fecha_ingreso, activo)
       VALUES ($1, $2, CURRENT_DATE, true)`,
      [userId, userRolId]
    );

    if (carrera_id) {
      await client.query(
        `INSERT INTO profesor_carrera (id_profesor, id_carrera, dedicacion, fecha_desde, activo)
         VALUES ($1, $2, 'TIEMPO_COMPLETO', CURRENT_DATE, true)`,
        [userId, carrera_id]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({ success: true, message: 'Registrado con éxito' });

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Error en registro:', error.message);
    res.status(500).json({
      error: 'Error al registrar',
      detalle: error.message,
      code: error.code
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// --- LOGIN ---
router.post('/login', async (req, res) => {
  const { correo, password } = req.body;

  if (!correo || !password) {
    return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
  }

  try {
    const usuario = await Usuario.findByEmail(correo);

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const passValido = await bcrypt.compare(password, usuario.contrasena);

    if (!passValido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Determinar el rol del usuario
    let rol = 'profesor';
    const rolQuery = await pool.query(
      `SELECT r.nombre_rol
       FROM usuario_rol ur
       JOIN rol r ON ur.id_rol = r.id_rol
       WHERE ur.id_usuario = $1 AND ur.activo = true`,
      [usuario.id_usuario]
    );

    if (rolQuery.rows.length > 0) {
      const rolesEncontrados = rolQuery.rows.map(r => r.nombre_rol);
      if (rolesEncontrados.includes('auditor')) {
        rol = 'auditor';
      } else if (rolesEncontrados.includes('coordinador')) {
        rol = 'coordinador';
      }
    }

    // Obtener id_profesor para profesores
    let idProfesor = null;
    if (rol === 'profesor') {
      const profesorQuery = await pool.query(
        `SELECT p.id_profesor
         FROM profesor p
         JOIN usuario_rol ur ON p.id_usuario_rol = ur.id_usuario_rol
         WHERE ur.id_usuario = $1`,
        [usuario.id_usuario]
      );
      if (profesorQuery.rows.length > 0) {
        idProfesor = profesorQuery.rows[0].id_profesor;
      }
    }

    // Obtener id_coordinador para coordinadores
    let idCoordinador = null;
    if (rol === 'coordinador') {
      const coordinadorQuery = await pool.query(
        `SELECT id_coordinador FROM coordinador WHERE id_coordinador = $1`,
        [usuario.id_usuario]
      );
      if (coordinadorQuery.rows.length > 0) {
        idCoordinador = coordinadorQuery.rows[0].id_coordinador;
      }
    }

    const token = jwt.sign(
      {
        id: usuario.id_usuario,
        correo: usuario.correo,
        rol,
        esProfesor: rol === 'profesor',
        esCoordinador: rol === 'coordinador',
        id_profesor: idProfesor,
        id_coordinador: idCoordinador
      },
      process.env.JWT_SECRET || 'iujo_secret_key_2024',
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      token,
      usuario: {
        id: usuario.id_usuario,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        correo: usuario.correo,
        rol,
        roles: [rol],
        id_profesor: idProfesor,
        id_coordinador: idCoordinador
      }
    });

  } catch (error) {
    console.error('Error en login:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// --- VERIFICAR TOKEN ---
router.get('/verify', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'iujo_secret_key_2024');

    const userQuery = await pool.query(
      'SELECT id_usuario, nombre, apellido, correo FROM usuario WHERE id_usuario = $1 AND activo = true',
      [decoded.id]
    );

    if (userQuery.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    res.json({ valid: true, user: userQuery.rows[0] });
  } catch (error) {
    console.error('Error verificando token:', error.message);
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
});

export default router;