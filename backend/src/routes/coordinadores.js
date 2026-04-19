import express from 'express';
import Coordinador from '../models/coordinador.js';
import Usuario from '../models/usuario.js';
import auth from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Obtener todos los coordinadores (solo auditor/coordinador)
router.get('/', auth, async (req, res) => {
  try {
    const coordinadores = await Coordinador.findAll();
    res.json(coordinadores);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Obtener coordinador por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const coordinador = await Coordinador.findById(req.params.id);
    if (!coordinador) {
      return res.status(404).json({ error: 'Coordinador no encontrado' });
    }
    res.json(coordinador);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Obtener usuarios disponibles para ser coordinadores
router.get('/disponibles/usuarios', auth, async (req, res) => {
  if (!req.user.esCoordinador && req.user.rol !== 'auditor') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  try {
    const usuarios = await Coordinador.getUsuariosDisponibles();
    res.json(usuarios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Obtener carreras sin coordinador
router.get('/disponibles/carreras', auth, async (req, res) => {
  if (!req.user.esCoordinador && req.user.rol !== 'auditor') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  try {
    const carreras = await Coordinador.getCarrerasSinCoordinador();
    res.json(carreras);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Crear nuevo coordinador (con usuario nuevo o existente)
router.post('/', auth, async (req, res) => {
  if (req.user.rol !== 'auditor') {
    return res.status(403).json({ error: 'Solo el auditor puede agregar coordinadores' });
  }

  const { nombre, apellido, cedula, correo, telefono, password, id_carrera, usuarioExistenteId } = req.body;

  try {
    let id_usuario_rol;
    
    if (usuarioExistenteId) {
      // Usar usuario existente
      const rolResult = await pool.query(
        `INSERT INTO usuario_rol (id_usuario, id_rol, activo)
         VALUES ($1, (SELECT id_rol FROM rol WHERE nombre_rol = 'coordinador'), true)
         RETURNING id_usuario_rol`,
        [usuarioExistenteId]
      );
      id_usuario_rol = rolResult.rows[0].id_usuario_rol;
    } else {
      // Crear nuevo usuario
      const hashedPassword = await bcrypt.hash(password, 10);
      const userResult = await pool.query(
        `INSERT INTO usuario (nombre, apellido, cedula, correo, telefono, password, activo)
         VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id_usuario`,
        [nombre, apellido, cedula, correo, telefono, hashedPassword]
      );
      
      const rolResult = await pool.query(
        `INSERT INTO usuario_rol (id_usuario, id_rol, activo)
         VALUES ($1, (SELECT id_rol FROM rol WHERE nombre_rol = 'coordinador'), true)
         RETURNING id_usuario_rol`,
        [userResult.rows[0].id_usuario]
      );
      id_usuario_rol = rolResult.rows[0].id_usuario_rol;
    }

    const coordinador = await Coordinador.create(id_usuario_rol, id_carrera);
    res.status(201).json(coordinador);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear coordinador' });
  }
});

// Actualizar coordinador
router.put('/:id', auth, async (req, res) => {
  if (req.user.rol !== 'auditor') {
    return res.status(403).json({ error: 'Solo el auditor puede editar coordinadores' });
  }

  const { id_carrera } = req.body;
  try {
    const coordinador = await Coordinador.update(req.params.id, id_carrera);
    res.json(coordinador);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Eliminar coordinador
router.delete('/:id', auth, async (req, res) => {
  if (req.user.rol !== 'auditor') {
    return res.status(403).json({ error: 'Solo el auditor puede eliminar coordinadores' });
  }

  try {
    await Coordinador.delete(req.params.id);
    res.json({ success: true, message: 'Coordinador eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;