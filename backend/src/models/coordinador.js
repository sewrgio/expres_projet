import pool from '../config/db.js';

const Coordinador = {
  // Obtener todos los coordinadores (activos e inactivos)
  async findAll() {
    const result = await pool.query(`
      SELECT c.*, u.id_usuario, u.nombre, u.apellido, u.correo, u.cedula, u.telefono,
             u.activo as usuario_activo, car.nombre_carrera
      FROM coordinador c
      JOIN usuario_rol ur ON c.id_usuario_rol = ur.id_usuario_rol
      JOIN usuario u ON ur.id_usuario = u.id_usuario
      JOIN carrera car ON c.id_carrera = car.id_carrera
      ORDER BY u.activo DESC, car.nombre_carrera
    `);
    return result.rows;
  },

  // Obtener coordinador por ID
  async findById(id) {
    const result = await pool.query(`
      SELECT c.*, u.nombre, u.apellido, u.correo, u.cedula, u.telefono,
             u.activo as usuario_activo, car.nombre_carrera
      FROM coordinador c
      JOIN usuario_rol ur ON c.id_usuario_rol = ur.id_usuario_rol
      JOIN usuario u ON ur.id_usuario = u.id_usuario
      JOIN carrera car ON c.id_carrera = car.id_carrera
      WHERE c.id_coordinador = $1
    `, [id]);
    return result.rows[0];
  },

  // Obtener coordinador por carrera
  async findByCarrera(carreraId) {
    const result = await pool.query(`
      SELECT c.*, u.nombre, u.apellido, u.correo
      FROM coordinador c
      JOIN usuario_rol ur ON c.id_usuario_rol = ur.id_usuario_rol
      JOIN usuario u ON ur.id_usuario = u.id_usuario
      WHERE c.id_carrera = $1 AND u.activo = true
    `, [carreraId]);
    return result.rows[0];
  },

  // Crear coordinador (asociado a un usuario existente)
  async create(id_usuario_rol, id_carrera) {
    const result = await pool.query(`
      INSERT INTO coordinador (id_usuario_rol, id_carrera)
      VALUES ($1, $2) RETURNING *
    `, [id_usuario_rol, id_carrera]);
    return result.rows[0];
  },

  // Actualizar coordinador
  async update(id, id_carrera) {
    const result = await pool.query(`
      UPDATE coordinador 
      SET id_carrera = $1
      WHERE id_coordinador = $2 RETURNING *
    `, [id_carrera, id]);
    return result.rows[0];
  },

  // Eliminar coordinador (desactivar usuario)
  async delete(id) {
    const result = await pool.query(`
      UPDATE usuario u
      SET activo = false
      FROM usuario_rol ur
      JOIN coordinador c ON ur.id_usuario_rol = c.id_usuario_rol
      WHERE c.id_coordinador = $1 
        AND ur.id_usuario_rol = c.id_usuario_rol
        AND u.id_usuario = ur.id_usuario
      RETURNING u.*
    `, [id]);
    return result.rows[0];
  },

  // Desactivar coordinador (mismo comportamiento que delete pero con nombre más descriptivo)
  async deactivate(id) {
    return this.delete(id);
  },

  // Activar coordinador (marcar usuario como activo)
  async activate(id) {
    const result = await pool.query(`
      UPDATE usuario u
      SET activo = true
      FROM usuario_rol ur
      JOIN coordinador c ON ur.id_usuario_rol = c.id_usuario_rol
      WHERE c.id_coordinador = $1 
        AND ur.id_usuario_rol = c.id_usuario_rol
        AND u.id_usuario = ur.id_usuario
      RETURNING u.*
    `, [id]);
    return result.rows[0];
  },

  // Obtener usuarios que pueden ser coordinadores (no tienen rol aún)
  async getUsuariosDisponibles() {
    const result = await pool.query(`
      SELECT u.* 
      FROM usuario u
      WHERE u.activo = true 
        AND NOT EXISTS (
          SELECT 1 FROM usuario_rol ur 
          WHERE ur.id_usuario = u.id_usuario 
            AND ur.activo = true
        )
      ORDER BY u.nombre, u.apellido
    `);
    return result.rows;
  },

  // Obtener carreras sin coordinador
  async getCarrerasSinCoordinador() {
    const result = await pool.query(`
      SELECT c.* 
      FROM carrera c
      WHERE c.activo = true 
        AND NOT EXISTS (
          SELECT 1 FROM coordinador co 
          WHERE co.id_carrera = c.id_carrera
        )
      ORDER BY c.nombre_carrera
    `);
    return result.rows;
  }
};

export default Coordinador;