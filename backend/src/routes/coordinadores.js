import express from 'express';
import Coordinador from '../models/coordinador.js';
import Usuario from '../models/usuario.js';
import auth from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

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
  if (!req.user.esCoordinador && !req.user.roles.includes('auditor')) {
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
  if (!req.user.esCoordinador && !req.user.roles.includes('auditor')) {
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
  if (!req.user.roles.includes('auditor')) {
    return res.status(403).json({ error: 'Solo el auditor puede agregar coordinadores' });
  }

  const { nombre, apellido, cedula, correo, telefono, password, id_carrera, usuarioExistenteId, esCoordinador, esProfesor, esAdjuntoCoordinacion } = req.body;

  // ✅ Validar que no sea Coordinador y Adjunto simultáneamente
  if (esCoordinador && esAdjuntoCoordinacion) {
    return res.status(400).json({ 
      error: 'No puede ser Coordinador y Adjunto a la Coordinación simultáneamente' 
    });
  }

  try {
    // Validar que solo existe un coordinador por carrera
    if (esCoordinador && id_carrera) {
      const coordinadorExistente = await pool.query(
        `SELECT c.id_coordinador, u.nombre, u.apellido 
         FROM coordinador c
         JOIN usuario_rol ur ON c.id_usuario_rol = ur.id_usuario_rol
         JOIN usuario u ON ur.id_usuario = u.id_usuario
         WHERE c.id_carrera = $1 AND u.activo = true`,
        [id_carrera]
      );
      
      if (coordinadorExistente.rows.length > 0) {
        return res.status(400).json({ 
          error: `Ya existe un coordinador asignado a esta carrera: ${coordinadorExistente.rows[0].nombre} ${coordinadorExistente.rows[0].apellido}` 
        });
      }
    }

    // Validar que solo existe un adjunto a la coordinación por carrera
    if (esAdjuntoCoordinacion && id_carrera) {
      const adjuntoExistente = await pool.query(
        `SELECT u.nombre, u.apellido 
         FROM usuario u
         JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
         JOIN categoria c ON ur.id_categoria = c.id_categoria
         JOIN coordinador coord ON ur.id_usuario_rol = coord.id_usuario_rol
         WHERE c.nombre = 'Adjunto coordinacion' AND c.tip_id = 1
           AND coord.id_carrera = $1 
           AND u.activo = true`,
        [id_carrera]
      );
      
      if (adjuntoExistente.rows.length > 0) {
        return res.status(400).json({ 
          error: `Ya existe un adjunto a la coordinación en esta carrera: ${adjuntoExistente.rows[0].nombre} ${adjuntoExistente.rows[0].apellido}` 
        });
      }
    }

    let id_usuario;
    let id_usuario_rol;
    
    if (usuarioExistenteId) {
      // Usar usuario existente
      id_usuario = usuarioExistenteId;
    } else {
      // Crear nuevo usuario
      const hashedPassword = await bcrypt.hash(password, 10);
      const maxRes = await pool.query('SELECT COALESCE(MAX(id_usuario), 0) + 1 as next_id FROM usuario');
      const nextUserId = maxRes.rows[0].next_id;

      const userResult = await pool.query(
        `INSERT INTO usuario (id_usuario, nombre, apellido, cedula, correo, telefono, contrasena, activo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING id_usuario`,
        [nextUserId, nombre, apellido, cedula, correo, telefono, hashedPassword]
      );
      id_usuario = userResult.rows[0].id_usuario;
    }

    // Asignar rol de coordinador si está seleccionado
    if (esCoordinador) {
      const maxIdRes = await pool.query('SELECT COALESCE(MAX(id_usuario_rol), 0) + 1 as next_id FROM usuario_rol');
      const nextId = maxIdRes.rows[0].next_id;

      const rolResult = await pool.query(
        `INSERT INTO usuario_rol (id_usuario_rol, id_usuario, id_categoria, fecha_desde, activo)
         VALUES ($1, $2, (SELECT id_categoria FROM categoria WHERE nombre = 'Coordinador' AND tip_id = 1), CURRENT_DATE, true)
         RETURNING id_usuario_rol`,
        [nextId, id_usuario]
      );
      id_usuario_rol = rolResult.rows[0].id_usuario_rol;
      
      // Crear registro en tabla coordinador
      await Coordinador.create(id_usuario_rol, id_carrera);
    }

    // Asignar rol de profesor si está seleccionado
    if (esProfesor) {
      const maxIdRes = await pool.query('SELECT COALESCE(MAX(id_usuario_rol), 0) + 1 as next_id FROM usuario_rol');
      const nextId = maxIdRes.rows[0].next_id;

      await pool.query(
        `INSERT INTO usuario_rol (id_usuario_rol, id_usuario, id_categoria, fecha_desde, activo)
         VALUES ($1, $2, (SELECT id_categoria FROM categoria WHERE nombre = 'Profesor' AND tip_id = 1), CURRENT_DATE, true)`,
        [nextId, id_usuario]
      );
    }

    // Asignar rol de adjunto a coordinación si está seleccionado
    if (esAdjuntoCoordinacion) {
      const maxIdRes = await pool.query('SELECT COALESCE(MAX(id_usuario_rol), 0) + 1 as next_id FROM usuario_rol');
      const nextId = maxIdRes.rows[0].next_id;

      const rolResult = await pool.query(
        `INSERT INTO usuario_rol (id_usuario_rol, id_usuario, id_categoria, fecha_desde, activo)
         VALUES ($1, $2, (SELECT id_categoria FROM categoria WHERE nombre = 'Adjunto coordinacion' AND tip_id = 1), CURRENT_DATE, true)
         RETURNING id_usuario_rol`,
        [nextId, id_usuario]
      );
      id_usuario_rol = rolResult.rows[0].id_usuario_rol;
      
      // Crear registro en tabla coordinador para el adjunto (el adjunto necesita id_carrera también)
      await Coordinador.create(id_usuario_rol, id_carrera);
    }

    // Sincronizar la columna JSONB rol en la tabla usuario
    await pool.query(`
      UPDATE usuario 
      SET rol = (
        SELECT COALESCE(jsonb_agg(LOWER(c.nombre)), '[]'::jsonb)
        FROM usuario_rol ur
        JOIN categoria c ON ur.id_categoria = c.id_categoria
        WHERE ur.id_usuario = $1 AND ur.activo = true AND c.tip_id = 1
      )
      WHERE id_usuario = $1
    `, [id_usuario]);

    res.status(201).json({ 
      success: true, 
      message: 'Usuario creado con los roles seleccionados',
      id_usuario 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear coordinador' });
  }
});

// Actualizar coordinador
router.put('/:id', auth, async (req, res) => {
  if (!req.user.roles.includes('auditor')) {
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
  if (!req.user.roles.includes('auditor')) {
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

// Desactivar coordinador (solo marca como inactivo)
router.put('/:id/desactivar', auth, async (req, res) => {
  if (!req.user.roles.includes('auditor')) {
    return res.status(403).json({ error: 'Solo el auditor puede desactivar coordinadores' });
  }

  try {
    await Coordinador.deactivate(req.params.id);
    res.json({ success: true, message: 'Coordinador desactivado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al desactivar coordinador' });
  }
});

// Activar coordinador (marca como activo)
router.put('/:id/activar', auth, async (req, res) => {
  if (!req.user.roles.includes('auditor')) {
    return res.status(403).json({ error: 'Solo el auditor puede activar coordinadores' });
  }

  try {
    await Coordinador.activate(req.params.id);
    res.json({ success: true, message: 'Coordinador activado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al activar coordinador' });
  }
});

export default router;