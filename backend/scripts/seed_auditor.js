import pool from './src/config/db.js';
import bcrypt from 'bcryptjs';

async function seedAuditor() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Crear el rol de auditor si no existe
    console.log('Verificando rol auditor...');
    let rolRes = await client.query("SELECT id_rol FROM rol WHERE nombre_rol = 'auditor'");
    let id_rol;
    
    if (rolRes.rows.length === 0) {
      console.log('Creando rol auditor...');
      const insertRol = await client.query(
        "INSERT INTO rol (nombre_rol, descripcion, activo) VALUES ('auditor', 'Auditor del sistema', true) RETURNING id_rol"
      );
      id_rol = insertRol.rows[0].id_rol;
    } else {
      id_rol = rolRes.rows[0].id_rol;
      console.log('El rol auditor ya existe.');
    }

    // 2. Verificar si ya existe el usuario auditor
    const correoAuditor = 'auditor@iujo.edu';
    const userRes = await client.query('SELECT id_usuario FROM usuario WHERE correo = $1', [correoAuditor]);
    
    if (userRes.rows.length === 0) {
      console.log('Creando usuario auditor...');
      const hashedPassword = await bcrypt.hash('12345', 10);
      
      const newUser = await client.query(
        `INSERT INTO usuario (nombre, apellido, cedula, correo, telefono, contrasena, activo)
         VALUES ('Admin', 'Auditor', 'V-00000000', $1, '0000', $2, true) RETURNING id_usuario`,
        [correoAuditor, hashedPassword]
      );
      
      const id_usuario = newUser.rows[0].id_usuario;

      console.log('Asignando rol al usuario...');
      await client.query(
        `INSERT INTO usuario_rol (id_usuario, id_rol, fecha_desde, activo)
         VALUES ($1, $2, CURRENT_DATE, true)`,
        [id_usuario, id_rol]
      );
      
      console.log('✅ Usuario auditor creado con éxito.');
      console.log('📧 Correo: auditor@iujo.edu');
      console.log('🔑 Contraseña: 12345');
    } else {
      console.log('✅ El usuario auditor ya existe.');
      console.log('📧 Correo: auditor@iujo.edu');
      console.log('🔑 Contraseña: 12345 (o la que hayas configurado)');
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creando el auditor:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

seedAuditor();
