-- Migración para agregar columna fecha_actualizacion a la tabla ubicacion_usuario

DO $$
BEGIN
    -- Verificar si la columna existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'ubicacion_usuario'
        AND column_name = 'fecha_actualizacion'
    ) THEN
        -- Agregar la columna fecha_actualizacion
        ALTER TABLE ubicacion_usuario
        ADD COLUMN fecha_actualizacion TIMESTAMP DEFAULT NOW();

        RAISE NOTICE 'Columna fecha_actualizacion agregada a ubicacion_usuario';
    ELSE
        RAISE NOTICE 'La columna fecha_actualizacion ya existe en ubicacion_usuario';
    END IF;
END $$;
