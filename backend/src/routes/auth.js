import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Usuario from '../models/usuario.js';
import pool from '../config/db.js';
import { sendVerificationEmail, sendRecoveryCode } from '../services/emailService.js';
import { registrarBitacora } from '../utils/bitacora.js';

const router = express.Router();

// --- REGISTRO ---
router.post('/register', async (req, res) => {
  const { nombre, apellido, cedula, correo, telefono, password, roles, carreras } = req.body;

  let client;

  try {
    client = await pool.connect();

    const existe = await Usuario.findByEmail(correo);
    if (existe) {
      return res.status(400).json({ error: 'El correo ya existe' });
    }

    await client.query('BEGIN');

    // 1. Insertar usuario
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Obtener el siguiente ID manualmente
    const maxUserRes = await client.query('SELECT COALESCE(MAX(id_usuario), 0) + 1 as next_id FROM usuario');
    const nextUserId = maxUserRes.rows[0].next_id;

    const userRes = await client.query(
      `INSERT INTO usuario (id_usuario, nombre, apellido, cedula, correo, telefono, contrasena, codigo_verificacion, fecha_codigo_verificacion, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), true)
       RETURNING id_usuario`,
      [nextUserId, nombre, apellido, cedula, correo, telefono, hashedPassword, verificationToken]
    );
    const userId = userRes.rows[0].id_usuario;

    // 2. Asignar roles (auditor es exclusivo, otros pueden ser múltiples)
    const rolesAsignar = Array.isArray(roles) ? roles : (roles ? [roles] : ['profesor']);

    // Validar: auditor no puede combinarse con otros roles
    if (rolesAsignar.includes('auditor') && rolesAsignar.length > 1) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El rol de auditor es exclusivo y no puede combinarse con otros roles' });
    }

    // Validar: solo puede existir un auditor en el sistema
    if (rolesAsignar.includes('auditor')) {
      const auditorExistente = await client.query(
        `SELECT COUNT(*) as count
         FROM usuario_rol ur
         JOIN categoria c ON ur.id_categoria = c.id_categoria
         WHERE LOWER(c.nombre) = 'auditor' AND c.tip_id = 1 AND ur.activo = true`
      );
      if (parseInt(auditorExistente.rows[0].count) > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Ya existe un auditor en el sistema. Solo puede haber un auditor.' });
      }
    }

    const userRolIds = [];

    for (const rolNombre of rolesAsignar) {
      // Obtener el siguiente ID manualmente
      const maxIdRes = await client.query('SELECT COALESCE(MAX(id_usuario_rol), 0) + 1 as next_id FROM usuario_rol');
      const nextId = maxIdRes.rows[0].next_id;

      const rolRes = await client.query(
        `INSERT INTO usuario_rol (id_usuario_rol, id_usuario, id_categoria, fecha_desde, activo)
         VALUES ($1, $2, (SELECT id_categoria FROM categoria WHERE LOWER(nombre) = LOWER($3) AND tip_id = 1 LIMIT 1), CURRENT_DATE, true)
         RETURNING id_usuario_rol`,
        [nextId, userId, rolNombre]
      );
      userRolIds.push(rolRes.rows[0].id_usuario_rol);
    }

    // 3. Crear perfil de profesor si tiene rol de profesor
    if (rolesAsignar.includes('profesor')) {
      const profesorRolId = userRolIds[rolesAsignar.indexOf('profesor')] || userRolIds[0];
      await client.query(
        `INSERT INTO profesor (id_profesor, id_usuario_rol, fecha_ingreso, activo)
         VALUES ($1, $2, CURRENT_DATE, true)`,
        [userId, profesorRolId]
      );

      // 4. Asignar carreras múltiples si se proporcionan
      if (carreras && Array.isArray(carreras) && carreras.length > 0) {
        for (const carreraId of carreras) {
          const maxIdRes = await client.query('SELECT COALESCE(MAX(id_profesor_carrera), 0) + 1 as next_id FROM profesor_carrera');
          const nextId = maxIdRes.rows[0].next_id;

          await client.query(
            `INSERT INTO profesor_carrera (id_profesor_carrera, id_profesor, id_carrera, dedicacion, fecha_desde, activo)
             VALUES ($1, $2, $3, 'TIEMPO_COMPLETO', CURRENT_DATE, true)`,
            [nextId, userId, carreraId]
          );
        }
      }
    }

    // 5. Crear perfil de coordinador si tiene rol de coordinador
    if (rolesAsignar.includes('coordinador')) {
      const coordinadorRolId = userRolIds[rolesAsignar.indexOf('coordinador')] || userRolIds[0];
      // Coordinadores solo pueden tener UNA carrera (la primera si se proporciona)
      const carreraCoordinador = (carreras && Array.isArray(carreras) && carreras.length > 0) ? carreras[0] : null;
      if (carreraCoordinador) {
        await client.query(
          `INSERT INTO coordinador (id_coordinador, id_usuario_rol, id_carrera, fecha_desde, activo)
           VALUES ($1, $2, $3, CURRENT_DATE, true)`,
          [userId, coordinadorRolId, carreraCoordinador]
        );
      }
    }

    // Sincronizar la columna JSONB rol en la tabla usuario
    await client.query(`
      UPDATE usuario 
      SET rol = (
        SELECT COALESCE(jsonb_agg(LOWER(c.nombre)), '[]'::jsonb)
        FROM usuario_rol ur
        JOIN categoria c ON ur.id_categoria = c.id_categoria
        WHERE ur.id_usuario = $1 AND ur.activo = true AND c.tip_id = 1
      )
      WHERE id_usuario = $1
    `, [userId]);

    await client.query('COMMIT');

    // Intentar enviar correo de verificación
    try {
      console.log(`Intentando enviar email de verificación a ${correo}...`);
      await sendVerificationEmail(correo, nombre, verificationToken);
      console.log('Email de verificación enviado con éxito');
    } catch (mailError) {
      console.error('Error enviando email de verificación:', mailError.message);
      // No fallamos el registro, pero avisamos en el log
    }

    res.status(201).json({ success: true, message: 'Registrado con éxito. Por favor verifica tu correo.' });

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

// --- VERIFICAR EMAIL ---
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Token es requerido' });
  }

  try {
    const user = await Usuario.verifyEmail(token);
    if (!user) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    res.json({ success: true, message: 'Correo verificado con éxito' });
  } catch (error) {
    console.error('Error verificando email:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// --- LOGIN ---
router.post('/login', async (req, res) => {
  const { correo, password, platform } = req.body;
  
  // Detectar plataforma si no viene explícita (para evitar que la app móvil sobreescriba la sesión web)
  let plataforma = platform;
  if (!plataforma) {
    const userAgent = req.headers['user-agent']?.toLowerCase() || '';
    if (userAgent.includes('dart') || userAgent.includes('flutter') || userAgent.includes('android') || userAgent.includes('ios') || userAgent.includes('okhttp')) {
      plataforma = 'app';
    } else {
      plataforma = 'web';
    }
  }

  if (!correo || !password) {
    return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
  }

  try {
    console.log('Intentando login para correo:', correo);
    const usuario = await Usuario.findByEmail(correo);
    console.log('Usuario encontrado:', usuario ? 'Sí' : 'No');

    if (!usuario) {
      await registrarBitacora(null, 'ACCESO_LOGIN_FALLIDO', `Intento de inicio de sesión fallido: no existe cuenta con el correo: ${correo}`);
      return res.status(401).json({ error: 'No existe una cuenta con este correo electrónico' });
    }

    // Verificar que el usuario esté activo
    if (!usuario.activo) {
      await registrarBitacora(usuario.id_usuario, 'ACCESO_LOGIN_BLOQUEADO', `Intento de inicio de sesión bloqueado: el usuario ${correo} está inactivo o desactivado.`);
      return res.status(403).json({ error: 'Tu cuenta ha sido desactivada. Contacta al administrador para más información.' });
    }

    if (!usuario.email_verificado) {
      await registrarBitacora(usuario.id_usuario, 'ACCESO_LOGIN_FALLIDO', `Intento de inicio de sesión fallido: el usuario ${correo} no ha verificado su correo electrónico.`);
      return res.status(403).json({ error: 'Por favor, verifica tu correo electrónico antes de iniciar sesión' });
    }

    const passValido = await bcrypt.compare(password, usuario.contrasena);
    console.log('Contraseña válida:', passValido);

    if (!passValido) {
      await registrarBitacora(usuario.id_usuario, 'ACCESO_LOGIN_FALLIDO', `Intento de inicio de sesión fallido: contraseña incorrecta para el correo: ${correo}`);
      return res.status(401).json({ error: 'La contraseña es incorrecta' });
    }

    // Obtener roles directamente de la tabla usuario_rol (fuente de verdad)
    const rolesQuery = await pool.query(
      `SELECT LOWER(c.nombre) as nombre_rol 
       FROM usuario_rol ur 
       JOIN categoria c ON ur.id_categoria = c.id_categoria 
       WHERE ur.id_usuario = $1 AND ur.activo = true AND c.tip_id = 1`,
      [usuario.id_usuario]
    );
    const rolesEncontrados = rolesQuery.rows.map(r => r.nombre_rol.trim());
    console.log('Roles encontrados (fuente de verdad):', rolesEncontrados);

    const esAdjunto = rolesEncontrados.includes('adjunto coordinacion');

    // Obtener id_profesor y carreras múltiples para profesores
    let idProfesor = null;
    let carrerasProfesor = [];
    if (rolesEncontrados.includes('profesor') || esAdjunto) {
      console.log('Buscando datos de profesor/adjunto...');
      const profesorQuery = await pool.query(
        `SELECT DISTINCT p.id_profesor, pc.id_carrera, c.nombre_carrera
         FROM profesor p
         JOIN usuario_rol ur ON p.id_usuario_rol = ur.id_usuario_rol
         LEFT JOIN profesor_carrera pc ON p.id_profesor = pc.id_profesor AND pc.activo = true
         LEFT JOIN carrera c ON pc.id_carrera = c.id_carrera
         WHERE ur.id_usuario = $1 AND ur.activo = true`,
        [usuario.id_usuario]
      );
      console.log('Profesor/Adjunto encontrado:', profesorQuery.rows);
      if (profesorQuery.rows.length > 0) {
        idProfesor = profesorQuery.rows[0].id_profesor;
        carrerasProfesor = profesorQuery.rows
          .filter(row => row.id_carrera)
          .map(row => ({ id: row.id_carrera, nombre: row.nombre_carrera }));
      }
    }

    // Obtener id_coordinador y carrera única para coordinadores
    let idCoordinador = null;
    let carreraCoordinador = null;
    if (rolesEncontrados.includes('coordinador') || esAdjunto) {
      console.log('Buscando datos de coordinador/adjunto...');
      const coordinadorQuery = await pool.query(
        `SELECT c.id_coordinador, c.id_carrera, ca.nombre_carrera
         FROM coordinador c
         JOIN usuario_rol ur ON c.id_usuario_rol = ur.id_usuario_rol
         LEFT JOIN carrera ca ON c.id_carrera = ca.id_carrera
         WHERE ur.id_usuario = $1 AND ur.activo = true`,
        [usuario.id_usuario]
      );
      console.log('Coordinador/Adjunto encontrado:', coordinadorQuery.rows);
      if (coordinadorQuery.rows.length > 0) {
        idCoordinador = coordinadorQuery.rows[0].id_coordinador;
        if (coordinadorQuery.rows[0].id_carrera) {
          carreraCoordinador = {
            id: coordinadorQuery.rows[0].id_carrera,
            nombre: coordinadorQuery.rows[0].nombre_carrera
          };
        }
      } else if (esAdjunto) {
        // Si es adjunto y no está en tabla coordinador, usar su id_profesor como id_coordinador virtual
        idCoordinador = idProfesor;
      }
    }

    // Combinar carreras: profesores pueden tener múltiples, coordinadores solo una
    const todasCarreras = [...carrerasProfesor];
    if (carreraCoordinador) {
      todasCarreras.push(carreraCoordinador);
    }
    const idsCarreras = [...new Set(todasCarreras.map(c => c.id))];

    // Extraer IDs individuales para compatibilidad
    const idCarreraCoordinador = carreraCoordinador?.id;
    const idCarreraProfesor = carrerasProfesor[0]?.id;

    console.log('Generando token JWT...');
    const token = jwt.sign(
      {
        id: usuario.id_usuario,
        correo: usuario.correo,
        roles: rolesEncontrados,
        esProfesor: rolesEncontrados.includes('profesor'),
        esCoordinador: rolesEncontrados.includes('coordinador') || esAdjunto,
        esAuditor: rolesEncontrados.includes('auditor'),
        id_profesor: idProfesor,
        id_coordinador: idCoordinador,
        carreras: todasCarreras,
        ids_carreras: idsCarreras
      },
      process.env.JWT_SECRET || 'iujo_secret_key_2024',
      { expiresIn: '30d' }
    );
    console.log('Token generado exitosamente');

    // Actualizar session_token según plataforma (web o app)
    console.log('Actualizando session_token...');
    await Usuario.updateSessionToken(usuario.id_usuario, token, plataforma);
    console.log('Session token actualizado');

    await registrarBitacora(
      usuario.id_usuario,
      'ACCESO_LOGIN_EXITOSO',
      `El usuario ${usuario.nombre} ${usuario.apellido} (Roles: ${rolesEncontrados.join(', ')}) inició sesión exitosamente en la plataforma ${plataforma}.`
    );

    res.json({
      success: true,
      token,
      usuario: {
        id: usuario.id_usuario,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        cedula: usuario.cedula,
        correo: usuario.correo,
        telefono: usuario.telefono,
        roles: rolesEncontrados,
        esProfesor: rolesEncontrados.includes('profesor'),
        esCoordinador: rolesEncontrados.includes('coordinador') || esAdjunto,
        esAuditor: rolesEncontrados.includes('auditor'),
        id_profesor: idProfesor,
        id_coordinador: idCoordinador,
        id_carrera: idCarreraCoordinador || idCarreraProfesor,
        nombre_carrera: carreraCoordinador?.nombre || carrerasProfesor[0]?.nombre || 'No disponible',
        carreras: todasCarreras,
        ids_carreras: idsCarreras
      }
    });

  } catch (error) {
    console.error('Error en login:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// --- RECUPERACIÓN DE CONTRASEÑA ---

// 1. Solicitar recuperación
router.post('/forgot-password', async (req, res) => {
  const { correo } = req.body;

  try {
    const usuario = await Usuario.findByEmail(correo);
    if (!usuario) {
      return res.status(404).json({ error: 'No existe un usuario con ese correo' });
    }

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    await Usuario.setRecoveryCode(correo, code);

    console.log(`Intentando enviar código de recuperación a ${correo}...`);
    try {
      await sendRecoveryCode(correo, code);
      console.log('Código de recuperación enviado con éxito');
      res.json({ success: true, message: 'Código de recuperación enviado' });
    } catch (mailError) {
      console.error('Error enviando email de recuperación:', mailError.message);
      res.status(500).json({ error: 'Error al enviar el correo. Por favor intenta más tarde.', detalle: mailError.message });
    }

  } catch (error) {
    console.error('Error en forgot-password:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 2. Validar código
router.post('/verify-recovery-code', async (req, res) => {
  const { correo, codigo } = req.body;

  try {
    const user = await Usuario.validateRecoveryCode(correo, codigo);
    if (!user) {
      return res.status(400).json({ error: 'Código inválido' });
    }

    res.json({ success: true, message: 'Código válido' });
  } catch (error) {
    console.error('Error en verify-recovery-code:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 3. Resetear contraseña
router.post('/reset-password', async (req, res) => {
  const { correo, codigo, password } = req.body;

  try {
    const user = await Usuario.validateRecoveryCode(correo, codigo);
    if (!user) {
      return res.status(400).json({ error: 'Código inválido o expirado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await Usuario.updatePassword(correo, hashedPassword);

    res.json({ success: true, message: 'Contraseña actualizada con éxito' });
  } catch (error) {
    console.error('Error en reset-password:', error.message);
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
      `SELECT id_usuario, nombre, apellido, cedula, correo, telefono, activo, session_token, session_token_app FROM usuario WHERE id_usuario = $1`,
      [decoded.id]
    );

    if (userQuery.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    // Verificar que el usuario esté activo
    if (!userQuery.rows[0].activo) {
      return res.status(403).json({ error: 'Tu cuenta ha sido desactivada. Contacta al administrador para más información.' });
    }

    const usuario = userQuery.rows[0];

    const rolesQuery = await pool.query(
      `SELECT LOWER(c.nombre) as nombre_rol 
       FROM usuario_rol ur 
       JOIN categoria c ON ur.id_categoria = c.id_categoria 
       WHERE ur.id_usuario = $1 AND ur.activo = true AND c.tip_id = 1`,
      [usuario.id_usuario]
    );
    const rolesEncontrados = rolesQuery.rows.map(r => r.nombre_rol.trim());
    const esAdjunto = rolesEncontrados.includes('adjunto coordinacion');

    // Obtener datos de profesor/adjunto
    let idProfesor = null;
    let carrerasProfesor = [];
    if (rolesEncontrados.includes('profesor') || esAdjunto) {
      const profesorQuery = await pool.query(
        `SELECT DISTINCT p.id_profesor, pc.id_carrera, c.nombre_carrera
         FROM profesor p
         JOIN usuario_rol ur ON p.id_usuario_rol = ur.id_usuario_rol
         LEFT JOIN profesor_carrera pc ON p.id_profesor = pc.id_profesor AND pc.activo = true
         LEFT JOIN carrera c ON pc.id_carrera = c.id_carrera
         WHERE ur.id_usuario = $1 AND ur.activo = true`,
        [usuario.id_usuario]
      );
      if (profesorQuery.rows.length > 0) {
        idProfesor = profesorQuery.rows[0].id_profesor;
        carrerasProfesor = profesorQuery.rows
          .filter(row => row.id_carrera)
          .map(row => ({ id: row.id_carrera, nombre: row.nombre_carrera }));
      }
    }

    // Obtener datos de coordinador/adjunto
    let idCoordinador = null;
    let carreraCoordinador = null;
    if (rolesEncontrados.includes('coordinador') || esAdjunto) {
      const coordinadorQuery = await pool.query(
        `SELECT c.id_coordinador, c.id_carrera, ca.nombre_carrera
         FROM coordinador c
         JOIN usuario_rol ur ON c.id_usuario_rol = ur.id_usuario_rol
         LEFT JOIN carrera ca ON c.id_carrera = ca.id_carrera
         WHERE ur.id_usuario = $1 AND ur.activo = true`,
        [usuario.id_usuario]
      );
      if (coordinadorQuery.rows.length > 0) {
        idCoordinador = coordinadorQuery.rows[0].id_coordinador;
        if (coordinadorQuery.rows[0].id_carrera) {
          carreraCoordinador = {
            id: coordinadorQuery.rows[0].id_carrera,
            nombre: coordinadorQuery.rows[0].nombre_carrera
          };
        }
      } else if (esAdjunto) {
        idCoordinador = idProfesor;
      }
    }

    if (usuario.session_token !== token && usuario.session_token_app !== token) {
      return res.status(401).json({ error: 'Sesión cerrada. Se inició sesión en otro dispositivo.' });
    }

    const idsCarreras = [...new Set([
      ...(carreraCoordinador ? [carreraCoordinador.id] : []),
      ...carrerasProfesor.map(c => c.id)
    ])];

    const todasCarreras = [...new Set([
      ...(carreraCoordinador ? [carreraCoordinador] : []),
      ...carrerasProfesor
    ].map(c => JSON.stringify(c)))].map(c => JSON.parse(c));

    res.json({ 
      valid: true, 
      user: { 
        id: usuario.id_usuario,
        id_usuario: usuario.id_usuario, 
        nombre: usuario.nombre, 
        apellido: usuario.apellido, 
        cedula: usuario.cedula,
        correo: usuario.correo,
        telefono: usuario.telefono,
        roles: rolesEncontrados,
        esProfesor: rolesEncontrados.includes('profesor'),
        esCoordinador: rolesEncontrados.includes('coordinador') || esAdjunto,
        esAuditor: rolesEncontrados.includes('auditor'),
        id_profesor: idProfesor,
        id_coordinador: idCoordinador,
        id_carrera: carreraCoordinador?.id || carrerasProfesor[0]?.id,
        nombre_carrera: carreraCoordinador?.nombre || carrerasProfesor[0]?.nombre || 'No disponible',
        carreras: todasCarreras,
        ids_carreras: idsCarreras
      } 
    });
  } catch (error) {
    console.error('Error verificando token:', error.message);
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
});

export default router;