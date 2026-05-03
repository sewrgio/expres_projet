-- Migración para agregar columna precision a la tabla ubicacion_usuario
-- (Si no existe, ya que precision es palabra reservada de PostgreSQL)

DO $$
BEGIN
    -- Verificar si la columna existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'ubicacion_usuario' 
        AND column_name = 'precision'
    ) THEN
        -- Agregar la columna precision
        ALTER TABLE ubicacion_usuario 
        ADD COLUMN "precision" NUMERIC(10, 2);
        
        RAISE NOTICE 'Columna precision agregada a ubicacion_usuario';
    ELSE
        RAISE NOTICE 'La columna precision ya existe en ubicacion_usuario';
    END IF;
END $$;
