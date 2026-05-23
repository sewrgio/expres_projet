import pool from '../src/config/db.js';

pool.query(`
  SELECT u.id_usuario, u.nombre, u.apellido, u.cedula, u.rol,
         c.id_coordinador, c.id_carrera, car.nombre_carrera
  FROM usuario u
  JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
  JOIN coordinador c ON ur.id_usuario_rol = c.id_usuario_rol
  JOIN carrera car ON c.id_carrera = car.id_carrera
  WHERE LOWER(car.nombre_carrera) LIKE '%electronica%' 
    AND u.rol @> '["adjunto coordinacion"]'::jsonb
    AND ur.activo = true 
    AND c.activo = true
  LIMIT 5
`).then(res => {
  console.log('Adjuntos de electrónica:');
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
