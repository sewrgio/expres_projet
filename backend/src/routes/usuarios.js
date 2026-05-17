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

// Obtener todos los usuarios con sus roles (soporta alias /todos)
router.get(['/', '/todos'], auth, async (req, res) => {
  if (!req.user.roles.includes('auditor')) {
    return res.status(403).json({ error: 'Solo el auditor puede ver todos los usuarios' });
  }

  try {
    const result = await pool.query(
      `SELECT id_usuario, nombre, apellido, cedula, correo, telefono, activo,
        COALESCE(rol, '[]'::jsonb) as roles
       FROM usuario
       ORDER BY nombre, apellido`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// Actualizar roles de un usuario
router.put('/:id/roles', auth, async (req, res) => {
  if (!req.user.roles.includes('auditor')) {
    return res.status(403).json({ error: 'Solo el auditor puede editar roles' });
  }

  const { id } = req.params;
  const { roles } = req.body; // array de strings, ej: ['profesor', 'coordinador']

  // Validar que no tenga coordinador y adjunto al mismo tiempo
  if (roles.includes('coordinador') && roles.includes('adjunto coordinacion')) {
    return res.status(400).json({ error: 'Un usuario no puede ser Coordinador y Adjunto a la vez' });
  }

  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Desactivar todos los roles actuales
    await client.query(`UPDATE usuario_rol SET activo = false WHERE id_usuario = $1`, [id]);

    for (const rol of roles) {
      if (rol === 'auditor') continue; // Evitar asignar auditor por esta vía por seguridad

      // Buscar si ya existe el registro en usuario_rol para reactivarlo, o crearlo
      const rolQuery = await client.query(`SELECT id_categoria FROM categoria WHERE LOWER(nombre) = LOWER($1) AND tip_id = 1 LIMIT 1`, [rol]);
      if (rolQuery.rows.length === 0) continue;
      const idRol = rolQuery.rows[0].id_categoria;

      const userRolExists = await client.query(
        `SELECT id_usuario_rol FROM usuario_rol WHERE id_usuario = $1 AND id_categoria = $2`,
        [id, idRol]
      );

      let userRolId;
      if (userRolExists.rows.length > 0) {
        userRolId = userRolExists.rows[0].id_usuario_rol;
        await client.query(`UPDATE usuario_rol SET activo = true WHERE id_usuario_rol = $1`, [userRolId]);
      } else {
        // Obtener el siguiente ID manualmente para evitar el error de restricción not-null
        const maxIdRes = await client.query('SELECT COALESCE(MAX(id_usuario_rol), 0) + 1 as next_id FROM usuario_rol');
        const nextId = maxIdRes.rows[0].next_id;

        const newUserRol = await client.query(
          `INSERT INTO usuario_rol (id_usuario_rol, id_usuario, id_categoria, fecha_desde, activo) 
           VALUES ($1, $2, $3, CURRENT_DATE, true) 
           RETURNING id_usuario_rol`,
          [nextId, id, idRol]
        );
        userRolId = newUserRol.rows[0].id_usuario_rol;
      }

      // Si es profesor, asegurar que exista el perfil
      if (rol === 'profesor') {
        const profExists = await client.query(`SELECT id_profesor FROM profesor WHERE id_usuario_rol = $1`, [userRolId]);
        if (profExists.rows.length === 0) {
          const maxProfIdRes = await client.query('SELECT COALESCE(MAX(id_profesor), 0) + 1 as next_id FROM profesor');
          const nextProfId = maxProfIdRes.rows[0].next_id;

          await client.query(
            `INSERT INTO profesor (id_profesor, id_usuario_rol, fecha_ingreso, activo) VALUES ($1, $2, CURRENT_DATE, true)`,
            [nextProfId, userRolId]
          );
        } else {
          await client.query(`UPDATE profesor SET activo = true WHERE id_usuario_rol = $1`, [userRolId]);
        }
      }

      // Si es coordinador o adjunto coordinacion, intentar activar su perfil existente.
      // NOTA: No podemos crearlo de cero aquí porque requerimos id_carrera. Debe hacerse por AgregarCoordinador.
      if (rol === 'coordinador' || rol === 'adjunto coordinacion') {
        const coordExists = await client.query(`SELECT id_coordinador FROM coordinador WHERE id_usuario_rol = $1`, [userRolId]);
        if (coordExists.rows.length > 0) {
          await client.query(`UPDATE coordinador SET activo = true WHERE id_usuario_rol = $1`, [userRolId]);
        }
      }
    }

    // Sincronizar la columna JSONB rol en la tabla usuario para búsquedas rápidas
    await client.query(`
      UPDATE usuario 
      SET rol = (
        SELECT COALESCE(jsonb_agg(LOWER(c.nombre)), '[]'::jsonb)
        FROM usuario_rol ur
        JOIN categoria c ON ur.id_categoria = c.id_categoria
        WHERE ur.id_usuario = $1 AND ur.activo = true AND c.tip_id = 1
      )
      WHERE id_usuario = $1
    `, [id]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Roles actualizados correctamente' });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error actualizando roles:', error);
    res.status(500).json({ error: 'Error al actualizar roles' });
  } finally {
    if (client) client.release();
  }
});

export default router;
