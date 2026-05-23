import pool from './src/config/db.js';
import bcrypt from 'bcryptjs';

const seedAdjuntos = async () => {
  try {
    console.log('Iniciando inserción de Adjuntos a la Coordinación por carrera...');

    // 1. Limpiar adjuntos previos para evitar duplicados en pruebas
    const emailsToDelete = [
      'adjunto.info@iujo.edu.ve',
      'adjunto.elec@iujo.edu.ve',
      'adjunto.admin@iujo.edu.ve',
      'adjunto.conta@iujo.edu.ve'
    ];
    
    await pool.query('DELETE FROM coordinador WHERE id_usuario_rol IN (SELECT id_usuario_rol FROM usuario_rol ur JOIN usuario u ON ur.id_usuario = u.id_usuario WHERE u.correo = ANY($1))', [emailsToDelete]);
    await pool.query('DELETE FROM profesor_carrera WHERE id_profesor IN (SELECT id_profesor FROM profesor p JOIN usuario_rol ur ON p.id_usuario_rol = ur.id_usuario_rol JOIN usuario u ON ur.id_usuario = u.id_usuario WHERE u.correo = ANY($1))', [emailsToDelete]);
    await pool.query('DELETE FROM profesor WHERE id_usuario_rol IN (SELECT id_usuario_rol FROM usuario_rol ur JOIN usuario u ON ur.id_usuario = u.id_usuario WHERE u.correo = ANY($1))', [emailsToDelete]);
    await pool.query('DELETE FROM usuario_rol WHERE id_usuario IN (SELECT id_usuario FROM usuario WHERE correo = ANY($1))', [emailsToDelete]);
    await pool.query('DELETE FROM usuario WHERE correo = ANY($1)', [emailsToDelete]);

    const careers = [
      { id: 2, name: 'Informatica', code: 'info' },
      { id: 3, name: 'Electronica', code: 'elec' },
      { id: 4, name: 'Administracion', code: 'admin' },
      { id: 5, name: 'Contaduria', code: 'conta' }
    ];

    const hashedPassword = bcrypt.hashSync('12345678', 10);

    for (const career of careers) {
      console.log(`Generando adjunto para carrera: ${career.name} (ID: ${career.id})...`);

      // A. Crear Usuario
      const userMaxRes = await pool.query('SELECT COALESCE(MAX(id_usuario), 0) + 1 as next_id FROM usuario');
      const nextUserId = userMaxRes.rows[0].next_id;
      const userEmail = `adjunto.${career.code}@iujo.edu.ve`;

      await pool.query(`
        INSERT INTO usuario (id_usuario, nombre, apellido, cedula, correo, telefono, contrasena, activo, email_verificado, rol)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true, true, $8::jsonb)
      `, [
        nextUserId,
        `Adjunto`,
        career.name,
        `adj_${career.id}`,
        userEmail,
        '04120000000',
        hashedPassword,
        JSON.stringify(['adjunto coordinacion', 'profesor'])
      ]);

      // B. Crear Usuario_Rol para "Adjunto coordinacion" (id_categoria = 5)
      const urMaxRes1 = await pool.query('SELECT COALESCE(MAX(id_usuario_rol), 0) + 1 as next_id FROM usuario_rol');
      const nextUR1 = urMaxRes1.rows[0].next_id;
      await pool.query(`
        INSERT INTO usuario_rol (id_usuario_rol, id_usuario, id_categoria, fecha_desde, activo)
        VALUES ($1, $2, 5, CURRENT_DATE, true)
      `, [nextUR1, nextUserId]);

      // C. Crear Usuario_Rol para "Profesor" (id_categoria = 3)
      const urMaxRes2 = await pool.query('SELECT COALESCE(MAX(id_usuario_rol), 0) + 1 as next_id FROM usuario_rol');
      const nextUR2 = urMaxRes2.rows[0].next_id;
      await pool.query(`
        INSERT INTO usuario_rol (id_usuario_rol, id_usuario, id_categoria, fecha_desde, activo)
        VALUES ($1, $2, 3, CURRENT_DATE, true)
      `, [nextUR2, nextUserId]);

      // D. Crear Profesor
      const profMaxRes = await pool.query('SELECT COALESCE(MAX(id_profesor), 0) + 1 as next_id FROM profesor');
      const nextProfId = profMaxRes.rows[0].next_id;
      await pool.query(`
        INSERT INTO profesor (id_profesor, id_usuario_rol, fecha_ingreso, activo)
        VALUES ($1, $2, CURRENT_DATE, true)
      `, [nextProfId, nextUR2]);

      // E. Crear Profesor_Carrera
      const pcMaxRes = await pool.query('SELECT COALESCE(MAX(id_profesor_carrera), 0) + 1 as next_id FROM profesor_carrera');
      const nextPCId = pcMaxRes.rows[0].next_id;
      await pool.query(`
        INSERT INTO profesor_carrera (id_profesor_carrera, id_profesor, id_carrera, dedicacion, fecha_desde, activo)
        VALUES ($1, $2, $3, 'TIEMPO_COMPLETO', CURRENT_DATE, true)
      `, [nextPCId, nextProfId, career.id]);

      // F. Crear Coordinador (registro administrativo para el adjunto)
      const coordMaxRes = await pool.query('SELECT COALESCE(MAX(id_coordinador), 0) + 1 as next_id FROM coordinador');
      const nextCoordId = coordMaxRes.rows[0].next_id;
      await pool.query(`
        INSERT INTO coordinador (id_coordinador, id_usuario_rol, id_carrera, fecha_desde, activo)
        VALUES ($1, $2, $3, CURRENT_DATE, true)
      `, [nextCoordId, nextUR1, career.id]);

      // G. Generar asistencias personales de hoy para pruebas
      const asisMaxRes = await pool.query('SELECT COALESCE(MAX(id_asistencia), 0) + 1 as next_id FROM asistencia');
      const nextAsisId = asisMaxRes.rows[0].next_id;

      // Un horario ficticio para asociar (opcional, o nulo si es libre)
      const entradaHoy = new Date();
      entradaHoy.setHours(7, 30, 0, 0);

      const salidaHoy = new Date();
      salidaHoy.setHours(15, 30, 0, 0);

      await pool.query(`
        INSERT INTO asistencia (id_asistencia, id_profesor, id_horario, id_qr, id_coordinador, fecha_entrada, fecha_salida)
        VALUES ($1, $2, null, null, null, $3, $4)
      `, [nextAsisId, nextProfId, entradaHoy, salidaHoy]);

      console.log(`✅ Adjunto creado exitosamente: ${userEmail} (Clave: 12345678). Con asistencia de hoy registrada.`);
    }

    console.log('Sección de adjuntos completada con éxito.');
    process.exit(0);
  } catch (error) {
    console.error('Error al insertar adjuntos:', error);
    process.exit(1);
  }
};

seedAdjuntos();
