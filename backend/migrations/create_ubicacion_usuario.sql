-- Tabla para almacenar la ubicación más reciente de los usuarios (desde APK móvil)
CREATE TABLE IF NOT EXISTS ubicacion_usuario (
  id_usuario INTEGER PRIMARY KEY REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  latitud NUMERIC(10, 8) NOT NULL,
  longitud NUMERIC(11, 8) NOT NULL,
  precision NUMERIC(10, 2),
  fecha_actualizacion TIMESTAMP DEFAULT NOW()
);

-- Índice para búsquedas rápidas (ignorar si ya existe)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'ubicacion_usuario' AND indexname = 'idx_ubicacion_usuario_fecha') THEN
    CREATE INDEX idx_ubicacion_usuario_fecha ON ubicacion_usuario(fecha_actualizacion);
  END IF;
END $$;
