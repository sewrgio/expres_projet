-- Crear tabla para QR fijos/coordinaciones
CREATE TABLE IF NOT EXISTS qr_fijos (
    id_qr_fijo SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(100) NOT NULL UNIQUE,
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- Insertar los 6 QR fijos iniciales si no existen
INSERT INTO qr_fijos (nombre, codigo, activo) VALUES
    ('Informática', 'COORD_INFORMATICA', true),
    ('Educación', 'COORD_EDUCACION', true),
    ('Electrónica', 'COORD_ELECTRONICA', true),
    ('Contaduría', 'COORD_CONTADURIA', true),
    ('Dirección', 'COORD_DIRECCION', true),
    ('Administración de Empresas', 'COORD_ADMIN_EMPRESAS', true)
ON CONFLICT (codigo) DO NOTHING;
