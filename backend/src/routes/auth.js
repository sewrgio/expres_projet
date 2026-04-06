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
    // Solución para las restricciones circulares del IUJO
    await client.query('SET CONSTRAINTS ALL DEFERRED');

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 1. Crear Usuario
    const userRes = await client.query(
      `INSERT INTO usuario (nombre, apellido, cedula, correo, telefono, password, activo)
       VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id_usuario`,
      [nombre, apellido, cedula, correo, telefono, hashedPassword]
    );
    const userId = userRes.rows[0].id_usuario;

    // 2. Asignar Rol
    const rolNombre = rol || 'profesor';
    const rolRes = await client.query(
      `INSERT INTO usuario_rol (id_usuario, id_rol, fecha_desde, activo)
       VALUES ($1, (SELECT id_rol FROM rol WHERE nombre_rol = $2), CURRENT_DATE, true)
       RETURNING id_usuario_rol`,
      [userId, rolNombre]
    );
    const userRolId = rolRes.rows[0].id_usuario_rol;

    // 3. Crear Perfil de Profesor
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

// --- LOGIN ---
router.post('/login', async (req, res) => {
  const { correo, password } = req.body;
  try {
    const usuario = await Usuario.findByEmail(correo);
    if (!usuario) return res.status(401).json({ error: 'Usuario no encontrado' });

    const passValido = await bcrypt.compare(password, usuario.password);
    if (!passValido) return res.status(401).json({ error: 'Contraseña incorrecta' });

    const token = jwt.sign(
      { id: usuario.id_usuario, rol: usuario.es_profesor ? 'profesor' : 'coordinador' },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      usuario: { nombre: usuario.nombre, es_profesor: usuario.es_profesor }
    });
  } catch (error) {
    console.error("Error en login:", error.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;