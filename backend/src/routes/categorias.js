import express from 'express';
import pool from '../config/db.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Obtener todas las categorías base (tip_id IS NULL)
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id_categoria, nombre, descripcion 
       FROM categoria 
       WHERE tip_id IS NULL 
       ORDER BY id_categoria`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo categorias base:', error);
    res.status(500).json({ error: 'Error al obtener categorias' });
  }
});

// Obtener categorías hijas de un tip_id (ej. tip_id = 1 para roles)
router.get('/:tip_id', auth, async (req, res) => {
  const { tip_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT id_categoria, nombre, descripcion 
       FROM categoria 
       WHERE tip_id = $1 
       ORDER BY id_categoria`,
      [tip_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo categorias:', error);
    res.status(500).json({ error: 'Error al obtener categorias' });
  }
});

// Crear una nueva categoría
router.post('/', auth, async (req, res) => {
  const { nombre, descripcion, tip_id } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO categoria (nombre, descripcion, tip_id) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [nombre, descripcion, tip_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creando categoria:', error);
    res.status(500).json({ error: 'Error al crear la categoría' });
  }
});

// Actualizar una categoría
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion } = req.body;

  try {
    const result = await pool.query(
      `UPDATE categoria 
       SET nombre = $1, descripcion = $2 
       WHERE id_categoria = $3 
       RETURNING *`,
      [nombre, descripcion, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando categoria:', error);
    res.status(500).json({ error: 'Error al actualizar la categoría' });
  }
});

// Eliminar una categoría
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar si tiene hijas
    const hasChildren = await pool.query('SELECT id_categoria FROM categoria WHERE tip_id = $1 LIMIT 1', [id]);
    if (hasChildren.rows.length > 0) {
      return res.status(400).json({ error: 'No se puede eliminar una categoría que tiene elementos asociados' });
    }

    const result = await pool.query(
      'DELETE FROM categoria WHERE id_categoria = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json({ success: true, message: 'Categoría eliminada' });
  } catch (error) {
    console.error('Error eliminando categoria:', error);
    res.status(500).json({ error: 'Error al eliminar la categoría' });
  }
});

export default router;
