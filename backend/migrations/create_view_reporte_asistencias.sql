-- Crear vista para reporte de asistencias
CREATE OR REPLACE VIEW v_reporte_asistencias AS
SELECT 
    a.id_asistencia,
    a.id_profesor,
    a.id_qr,
    a.fecha_entrada,
    a.fecha_salida,
    u.nombre,
    u.apellido,
    u.correo,
    c.id_carrera,
    c.nombre_carrera,
    pc.dedicacion,
    q.descripcion as ubicacion,
    CASE 
        WHEN a.fecha_salida IS NULL THEN 'Inasistencia'
        ELSE 'Asistencia'
    END as estado,
    CASE 
        WHEN j.id_justificativo IS NOT NULL THEN j.estado
        ELSE NULL
    END as estado_justificativo,
    CASE 
        WHEN j.id_justificativo IS NOT NULL THEN j.motivo
        ELSE NULL
    END as motivo_justificativo
FROM asistencia a
JOIN profesor p ON a.id_profesor = p.id_profesor
JOIN usuario_rol ur ON p.id_usuario_rol = ur.id_usuario_rol
JOIN usuario u ON ur.id_usuario = u.id_usuario
LEFT JOIN profesor_carrera pc ON p.id_profesor = pc.id_profesor AND pc.activo = true
LEFT JOIN carrera c ON pc.id_carrera = c.id_carrera
LEFT JOIN qr q ON a.id_qr = q.id_qr
LEFT JOIN justificativo j ON a.id_asistencia = j.id_asistencia;
