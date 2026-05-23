import pool from './src/config/db.js';
async function check() {
  const res = await pool.query("SELECT id_usuario, correo, activo, email_verificado FROM usuario WHERE correo LIKE '%coord%' OR correo LIKE '%info%'");
  console.log('Usuarios:', res.rows);
  if (res.rows.length > 0) {
    const roles = await pool.query("SELECT ur.id_usuario, ur.id_usuario_rol, ur.activo, c.nombre FROM usuario_rol ur JOIN categoria c ON ur.id_categoria = c.id_categoria WHERE ur.id_usuario = ANY($1::int[])", [res.rows.map(r => r.id_usuario)]);
    console.log('Roles:', roles.rows);
    
    const coordinadores = await pool.query("SELECT * FROM coordinador WHERE id_usuario_rol = ANY($1::int[])", [roles.rows.map(r => r.id_usuario_rol)]);
    console.log('Coordinadores:', coordinadores.rows);
  }
  process.exit(0);
}
check();
