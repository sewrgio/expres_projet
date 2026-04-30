import express from 'express';
import pool from '../config/db.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Actualizar usuario (solo auditor)
router.put('/:id', auth, async (req, res) => {
  if (!req.user.roles.includes('auditor')) {
    return res.status(403).json({ error: 'Solo el auditor puede editar usuarios' });
  }

  const { id } = req.params;
  const { nombre, apellido, correo, telefono } = req.body;

  try {
    const result = await pool.query(
      `UPDATE usuario 
       SET nombre = $1, apellido = $2, correo = $3, telefono = $4
       WHERE id_usuario = $5 
       RETURNING id_usuario, nombre, apellido, correo, telefono`,
      [nombre, apellido, correo, telefono, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

export default router;
