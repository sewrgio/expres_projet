import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Usuario from '../models/usuario.js';
import pool from '../config/db.js';

const router = express.Router();

// --- REGISTRO ---
router.post('/register', async (req, res) => {
  const { nombre, apellido, cedula, correo, telefono, password, rol } = req.body;
  const client = await pool.connect();

  try {
    const existe = await Usuario.findByEmail(correo);
    if (existe) return res.status(400).json({ error: 'El correo ya existe' });

    await client.query('BEGIN');
    await client.query('SET CONSTRAINTS ALL DEFERRED');

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const userRes = await client.query(
      `INSERT INTO usuario (nombre, apellido, cedula, correo, telefono, password, activo)
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

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Registrado con éxito' });

  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error("Error en registro:", error.message);
    res.status(500).json({ error: 'Error al registrar', detalle: error.message });
  } finally {
    client.release();
  }
});

// --- LOGIN (CORREGIDO) ---
router.post('/login', async (req, res) => {
  const { correo, password } = req.body;

  try {
    const usuario = await Usuario.findByEmail(correo);
    
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const passValido = await bcrypt.compare(password, usuario.password);
    
    if (!passValido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Determinar el rol del usuario
    let rol = 'profesor';
    if (usuario.es_coordinador && usuario.es_coordinador > 0) {
      rol = 'coordinador';
    }

    // Generar token JWT
    const token = jwt.sign(
      { 
        id: usuario.id_usuario, 
        correo: usuario.correo,
        rol: rol,
        esProfesor: usuario.es_profesor > 0,
        esCoordinador: usuario.es_coordinador > 0,
        id_profesor: usuario.id_profesor || null,
        id_coordinador: usuario.id_coordinador || null
      },
      process.env.JWT_SECRET || 'iujo_secret_key_2024',
      { expiresIn: '8h' }
    );

    // Respuesta exitosa
    res.json({
      success: true,
      token,
      usuario: {
        id: usuario.id_usuario,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        correo: usuario.correo,
        rol: rol,
        roles: [rol]
      }
    });

  } catch (error) {
    console.error("Error en login:", error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;