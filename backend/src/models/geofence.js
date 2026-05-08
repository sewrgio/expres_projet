import pool from '../config/db.js';

const Geofence = {
  // Calcular distancia entre dos coordenadas (fórmula Haversine)
  calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  // Obtener todos los geofences activos
  async obtenerTodos() {
    const result = await pool.query(
      `SELECT * FROM geofence WHERE activo = true ORDER BY nombre`
    );
    return result.rows;
  },

  // Obtener un geofence por ID
  async obtenerPorId(id) {
    const result = await pool.query(
      `SELECT * FROM geofence WHERE id_geofence = $1`,
      [id]
    );
    return result.rows[0];
  },

  // Validar si una coordenada está dentro de un geofence
  async validarPosicion(latitud, longitud, idGeofence = null) {
    let query = `SELECT * FROM geofence WHERE activo = true`;
    const params = [];

    if (idGeofence) {
      query += ` AND id_geofence = $1`;
      params.push(idGeofence);
    }

    const result = await pool.query(query, params);
    const geofences = result.rows;

    const resultados = geofences.map(gf => {
      const distancia = this.calcularDistancia(
        latitud,
        longitud,
        gf.latitud,
        gf.longitud
      );

      return {
        id_geofence: gf.id_geofence,
        nombre: gf.nombre,
        dentro: distancia <= gf.radio_metros,
        distancia_metros: distancia,
        radio_metros: gf.radio_metros
      };
    });

    return resultados;
  },

  // Obtener el último estado de un usuario en un geofence
  async obtenerUltimoEstado(idUsuario, idGeofence) {
    const result = await pool.query(
      `SELECT * FROM geofence_event
       WHERE id_usuario = $1 AND id_geofence = $2
       ORDER BY fecha_evento DESC
       LIMIT 1`,
      [idUsuario, idGeofence]
    );
    return result.rows[0];
  },

  // Registrar evento de geofencing (entrada o salida)
  async registrarEvento(idUsuario, idGeofence, tipoEvento, latitud, longitud, distancia) {
    const maxRes = await pool.query('SELECT COALESCE(MAX(id_evento), 0) + 1 as next_id FROM geofence_event');
    const nextId = maxRes.rows[0].next_id;

    const result = await pool.query(
      `INSERT INTO geofence_event (id_evento, id_geofence, id_usuario, tipo_evento, latitud, longitud, distancia_metros)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [nextId, idGeofence, idUsuario, tipoEvento, latitud, longitud, distancia]
    );
    return result.rows[0];
  },

  // Procesar cambio de estado de geofencing
  async procesarCambioEstado(idUsuario, latitud, longitud) {
    const geofences = await this.obtenerTodos();
    const eventos = [];

    for (const gf of geofences) {
      const distancia = this.calcularDistancia(
        latitud,
        longitud,
        gf.latitud,
        gf.longitud
      );

      const dentro = distancia <= gf.radio_metros;
      const ultimoEstado = await this.obtenerUltimoEstado(idUsuario, gf.id_geofence);

      // Si no hay estado anterior, registrar el estado actual
      if (!ultimoEstado) {
        const evento = await this.registrarEvento(
          idUsuario,
          gf.id_geofence,
          dentro ? 'entrada' : 'salida',
          latitud,
          longitud,
          distancia
        );
        eventos.push(evento);
      } else {
        // Si hay estado anterior, verificar si cambió
        const estabaDentro = ultimoEstado.tipo_evento === 'entrada';

        if (dentro !== estabaDentro) {
          const evento = await this.registrarEvento(
            idUsuario,
            gf.id_geofence,
            dentro ? 'entrada' : 'salida',
            latitud,
            longitud,
            distancia
          );
          eventos.push(evento);
        }
      }
    }

    return eventos;
  },

  // Obtener historial de eventos de un usuario
  async obtenerHistorialUsuario(idUsuario, limite = 50) {
    const result = await pool.query(
      `SELECT ge.*, gf.nombre as nombre_geofence
       FROM geofence_event ge
       JOIN geofence gf ON ge.id_geofence = gf.id_geofence
       WHERE ge.id_usuario = $1
       ORDER BY ge.fecha_evento DESC
       LIMIT $2`,
      [idUsuario, limite]
    );
    return result.rows;
  },

  // Obtener eventos recientes de todos los usuarios
  async obtenerEventosRecientes(limite = 100) {
    const result = await pool.query(
      `SELECT ge.*, gf.nombre as nombre_geofence, u.nombre, u.apellido
       FROM geofence_event ge
       JOIN geofence gf ON ge.id_geofence = gf.id_geofence
       JOIN usuario u ON ge.id_usuario = u.id_usuario
       ORDER BY ge.fecha_evento DESC
       LIMIT $1`,
      [limite]
    );
    return result.rows;
  },

  // Crear nuevo geofence
  async crear(nombre, latitud, longitud, radioMetros) {
    const maxRes = await pool.query('SELECT COALESCE(MAX(id_geofence), 0) + 1 as next_id FROM geofence');
    const nextId = maxRes.rows[0].next_id;

    const result = await pool.query(
      `INSERT INTO geofence (id_geofence, nombre, latitud, longitud, radio_metros)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [nextId, nombre, latitud, longitud, radioMetros]
    );
    return result.rows[0];
  },

  // Actualizar geofence
  async actualizar(id, nombre, latitud, longitud, radioMetros, activo) {
    const result = await pool.query(
      `UPDATE geofence
       SET nombre = $1, latitud = $2, longitud = $3, radio_metros = $4, activo = $5, updated_at = NOW()
       WHERE id_geofence = $6
       RETURNING *`,
      [nombre, latitud, longitud, radioMetros, activo, id]
    );
    return result.rows[0];
  },

  // Eliminar geofence
  async eliminar(id) {
    const result = await pool.query(
      `DELETE FROM geofence WHERE id_geofence = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  }
};

export default Geofence;
