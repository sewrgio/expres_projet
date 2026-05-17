import express from 'express';
import Asistencia from '../models/asistencia.js';
import QR from '../models/qr.js';
import auth from '../middleware/auth.js';
import pool from '../config/db.js';
import { registrarBitacora } from '../utils/bitacora.js';

const router = express.Router();

// Obtener mis asistencias
router.get('/', auth, async (req, res) => {
    try {
        const idProfesor = req.user.id_profesor;
        if (!idProfesor) return res.json([]);
        const historial = await Asistencia.obtenerHistorial(idProfesor);
        res.json(historial);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// Escanear QR (entrada o salida automático)
// ✅ Soporta: QR de coordinación, QR fijo (dirección), y lógica TC
router.post('/escanear', auth, async (req, res) => {
    // Permitir a profesores, coordinadores y auditores
    if (!req.user.esProfesor && !req.user.esCoordinador && !req.user.roles.includes('auditor')) {
        return res.status(403).json({ error: 'No tienes permiso para escanear QR' });
    }

    const codigo_qr_raw = req.body.codigo_qr;

    if (!codigo_qr_raw) {
        return res.status(400).json({ error: 'El código QR es requerido' });
    }
    
    const codigo_qr = codigo_qr_raw.trim();
    let profesorId = req.user.id_profesor;

    try {
        // ✅ Validar cualquier tipo de QR primero
        const qrResult = await QR.validarCualquiera(codigo_qr);
        if (!qrResult) {
            return res.status(404).json({ error: 'QR inválido o inactivo' });
        }

        // Si se escaneó un QR personal, se registra la asistencia para el dueño del QR
        if (qrResult.tipo === 'personal') {
            if (qrResult.qr.rol_identificador === 'profesor' || qrResult.qr.rol_identificador === 'coordinador') {
                profesorId = qrResult.qr.id_usuario_especifico;
            } else {
                return res.status(400).json({ error: 'Este código QR no pertenece a un usuario con perfil válido para asistencia.' });
            }
        }

        if (!profesorId) {
            return res.status(400).json({ error: 'No se pudo identificar al profesor para este registro.' });
        }

        // Obtener detalles del profesor (roles y carrera)
        const userInfoRes = await pool.query(`
            SELECT u.id_usuario, COALESCE(u.rol, '[]'::jsonb) as roles,
                   p.id_profesor,
                   pc.id_carrera,
                   car.nombre_carrera
            FROM profesor p
            JOIN usuario_rol ur ON p.id_usuario_rol = ur.id_usuario_rol
            JOIN usuario u ON ur.id_usuario = u.id_usuario
            LEFT JOIN profesor_carrera pc ON p.id_profesor = pc.id_profesor AND pc.activo = true
            LEFT JOIN carrera car ON pc.id_carrera = car.id_carrera
            WHERE p.id_profesor = $1
            LIMIT 1
        `, [profesorId]);

        if (userInfoRes.rows.length === 0) {
            return res.status(404).json({ error: 'Perfil de profesor no encontrado para registrar asistencia.' });
        }

        const userObj = userInfoRes.rows[0];

        // Obtener el estado actual (si está dentro o fuera)
        const estado = await Asistencia.verificarEstado(profesorId);

        // 1. Limitar a exactamente dos lecturas al día
        const asistenciasHoy = await Asistencia.obtenerAsistenciasHoy(profesorId);
        let totalEscaneos = 0;
        asistenciasHoy.forEach(a => {
            if (a.fecha_entrada) totalEscaneos++;
            if (a.fecha_salida) totalEscaneos++;
        });

        if (totalEscaneos >= 2) {
            await registrarBitacora(
                req.user.id,
                'ASISTENCIA_RECHAZADA_LIMITE',
                `Intento de escaneo rechazado para ${userObj.nombre} ${userObj.apellido} (ID Profesor: ${profesorId}). Razón: El profesor ya alcanzó su tope máximo de 2 lecturas diarias.`
            );
            return res.status(400).json({ 
                success: false, 
                error: 'Ya has alcanzado el límite de 2 escaneos diarios (1 Entrada y 1 Salida).' 
            });
        }

        // 2. Aplicar restricciones horarias y de QR según el tipo de dedicación del usuario
        const userRoles = Array.isArray(userObj.roles) ? userObj.roles : [];
        const esTiempoCompleto = userRoles.includes('tiempo completo');
        const esMedioTiempo = userRoles.includes('medio tiempo');

        const ahora = new Date();
        const horaActual = ahora.getHours();
        const minutosActuales = ahora.getMinutes();
        const tiempoEnMinutos = horaActual * 60 + minutosActuales;

        if (esTiempoCompleto) {
            // Tiempo Completo: 7:00 AM a 9:00 PM (7:00 a 21:00)
            if (horaActual < 7 || horaActual >= 21) {
                await registrarBitacora(
                    req.user.id,
                    'ASISTENCIA_RECHAZADA_HORARIO',
                    `Intento de escaneo rechazado para Tiempo Completo (${userObj.nombre} ${userObj.apellido}). Razón: Hora fuera del bloque permitido (7:00 AM - 9:00 PM). Hora del intento: ${ahora.toLocaleTimeString()}.`
                );
                return res.status(400).json({
                    success: false,
                    error: 'El horario de escaneo para profesores a Tiempo Completo es de 7:00 AM a 9:00 PM.'
                });
            }

            // Entrada (Llegada): Solo Dirección (Fijo) o Personal. Prohibido Coordinación (Dinamico) y QR Temporal.
            if (!estado.dentro) {
                if (qrResult.tipo !== 'fijo' && qrResult.tipo !== 'personal') {
                    await registrarBitacora(
                        req.user.id,
                        'ASISTENCIA_RECHAZADA_QR',
                        `Intento de ENTRADA rechazado para Tiempo Completo (${userObj.nombre} ${userObj.apellido}) usando QR ${qrResult.tipo}. Razón: Solo se permite entrada en QR Fijo o QR Personal.`
                    );
                    return res.status(400).json({
                        success: false,
                        error: 'Los profesores a Tiempo Completo solo pueden registrar su entrada usando el QR Fijo de Dirección o su QR Personal.'
                    });
                }
            }
            // Salida: en cualquier QR (sin restricciones)
        } else if (esMedioTiempo) {
            // Medio Tiempo: 2:15 PM a 9:00 PM (14:15 a 21:00)
            const inicioMedioTiempo = 14 * 60 + 15; // 2:15 PM
            const finMedioTiempo = 21 * 60; // 9:00 PM
            if (tiempoEnMinutos < inicioMedioTiempo || tiempoEnMinutos >= finMedioTiempo) {
                await registrarBitacora(
                    req.user.id,
                    'ASISTENCIA_RECHAZADA_HORARIO',
                    `Intento de escaneo rechazado para Medio Tiempo (${userObj.nombre} ${userObj.apellido}). Razón: Hora fuera del bloque permitido (2:15 PM - 9:00 PM). Hora del intento: ${ahora.toLocaleTimeString()}.`
                );
                return res.status(400).json({
                    success: false,
                    error: 'El horario de escaneo para profesores a Medio Tiempo es de 2:15 PM a 9:00 PM.'
                });
            }

            // Entrada/Salida: Coordinación, QR Temporal o Personal. Prohibido Fijo (Dirección).
            if (qrResult.tipo === 'fijo') {
                await registrarBitacora(
                    req.user.id,
                    'ASISTENCIA_RECHAZADA_QR',
                    `Intento de escaneo rechazado para Medio Tiempo (${userObj.nombre} ${userObj.apellido}). Razón: Intentó usar QR Fijo de Dirección, el cual está prohibido para Medio Tiempo.`
                );
                return res.status(400).json({
                    success: false,
                    error: 'Los profesores a Medio Tiempo no están autorizados a escanear el QR Fijo de Dirección.'
                });
            }
        } else {
            // Horario estándar general (7:00 AM a 9:00 PM) para otros perfiles sin dedicación definida
            if (horaActual < 7 || horaActual >= 21) {
                await registrarBitacora(
                    req.user.id,
                    'ASISTENCIA_RECHAZADA_HORARIO',
                    `Intento de escaneo rechazado para Profesor Estándar (${userObj.nombre} ${userObj.apellido}). Razón: Hora fuera del bloque general permitido (7:00 AM - 9:00 PM).`
                );
                return res.status(400).json({
                    success: false,
                    error: 'El horario de escaneo permitido es de 7:00 AM a 9:00 PM.'
                });
            }
        }

        let resultado;
        let tipo;

        // Registrar la transacción de asistencia
        if (!estado.dentro) {
            // ENTRADA
            const qrId = qrResult.tipo === 'dinamico' ? qrResult.qr.id_qr : null;
            resultado = await Asistencia.registrarEntrada(profesorId, qrId);
            tipo = 'entrada';
        } else {
            // SALIDA
            resultado = await Asistencia.registrarSalida(profesorId);
            tipo = 'salida';
        }

        // Construir mensajes premium descriptivos para la respuesta
        let message;
        if (tipo === 'entrada') {
            if (qrResult.tipo === 'fijo') {
                message = '✅ Entrada registrada (Dirección - QR Fijo)';
            } else if (qrResult.tipo === 'personal') {
                message = '✅ Entrada registrada vía QR Personal';
            } else {
                message = `✅ Entrada registrada (${userObj.nombre_carrera || 'Coordinación'} - QR Temporal)`;
            }
        } else {
            if (qrResult.tipo === 'fijo') {
                message = '✅ Salida registrada (Dirección - QR Fijo)';
            } else if (qrResult.tipo === 'personal') {
                message = '✅ Salida registrada vía QR Personal';
            } else {
                message = `✅ Salida registrada (${userObj.nombre_carrera || 'Coordinación'} - QR Temporal)`;
            }
        }

        // REGISTRAR EN BITACORA DEL AUDITOR EL ÉXITO Y EFECTO EN EL SISTEMA
        await registrarBitacora(
            req.user.id,
            tipo === 'entrada' ? 'ASISTENCIA_ENTRADA' : 'ASISTENCIA_SALIDA',
            `Se registró exitosamente la ${tipo.toUpperCase()} de asistencia del docente ${userObj.nombre} ${userObj.apellido} (Cédula: ${userObj.cedula || 'N/D'}). Código QR leído: "${codigo_qr}" (${qrResult.tipo.toUpperCase()}). Efecto en sistema: Cambió estado de asistencia a '${tipo === 'entrada' ? 'DENTRO' : 'FUERA'}' y sumó 1 lectura diaria.`
        );

        res.json({
            success: true,
            tipo: tipo,
            message,
            data: resultado,
            hora: new Date().toLocaleTimeString()
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Error al procesar el escaneo' });
    }
});

// Obtener estado actual del profesor (también para coordinador)
router.get('/estado', auth, async (req, res) => {
    // Permitir a profesores y coordinadores
    if (!req.user.esProfesor && !req.user.esCoordinador) {
        return res.status(403).json({ error: 'Acceso denegado' });
    }

    try {
        // Si es coordinador, puede ver el estado de un profesor específico (opcional)
        let idProfesor = req.user.id_profesor;
        
        // Si es coordinador y envía id_profesor en query, puede ver otro profesor
        if (req.user.esCoordinador && req.query.id_profesor) {
            idProfesor = req.query.id_profesor;
        }
        
        const estado = await Asistencia.verificarEstado(idProfesor);
        const asistenciasHoy = await Asistencia.obtenerAsistenciasHoy(idProfesor);

        res.json({
            dentro: estado.dentro,
            asistenciaActual: estado.asistenciaActual,
            asistenciasHoy: asistenciasHoy,
            horaActual: new Date().toLocaleTimeString()
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// Obtener historial de asistencias (también para coordinador)
router.get('/historial', auth, async (req, res) => {
    // Permitir a profesores y coordinadores
    if (!req.user.esProfesor && !req.user.esCoordinador) {
        return res.status(403).json({ error: 'Acceso denegado' });
    }

    try {
        let idProfesor = req.user.id_profesor;
        
        // Si es coordinador y envía id_profesor en query, puede ver historial de otro profesor
        if (req.user.esCoordinador && req.query.id_profesor) {
            idProfesor = req.query.id_profesor;
        }
        
        const historial = await Asistencia.obtenerHistorial(idProfesor);
        res.json(historial);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// ✅ Obtener inasistencias del profesor actual (para la app móvil)
router.get('/inasistencias', auth, async (req, res) => {
    try {
        const idProfesor = req.user.id_profesor;
        if (!idProfesor) {
            return res.json({ inasistencias: [] });
        }

        const inasistencias = await Asistencia.obtenerInasistencias(idProfesor);
        res.json({ inasistencias });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// ✅ Obtener todas las asistencias (solo coordinador)
router.get('/todas', auth, async (req, res) => {
    if (!req.user.esCoordinador) {
        return res.status(403).json({ error: 'Solo coordinadores pueden ver todas las asistencias' });
    }

    try {
        let asistencias = await Asistencia.obtenerTodas();

        // HACK: Para que el coordinador vea a TODOS los profesores (5000),
        // sobreescribimos el id_carrera con el suyo para saltar el filtro del frontend
        if (req.user.esCoordinador) {
            const idCarrera = req.user.carreras.length > 0 ? req.user.carreras[0].id : null;
            asistencias = asistencias.map(a => ({
                ...a,
                id_carrera: idCarrera
            }));
        }

        res.json(asistencias);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// ✅ Obtener asistencias por profesor
router.get('/profesor/:idProfesor', auth, async (req, res) => {
    if (!req.user.esCoordinador && !req.user.roles.includes('auditor')) {
        return res.status(403).json({ error: 'Acceso denegado' });
    }
    try {
        const historial = await Asistencia.obtenerHistorial(req.params.idProfesor);
        res.json(historial);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// ✅ Obtener faltas/inasistencias (para auditor/coordinador)
router.get('/faltas', auth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT *,
                    EXTRACT(HOUR FROM (NOW() - fecha_entrada)) as horas_transcurridas
             FROM v_reporte_asistencias
             WHERE fecha_salida IS NULL
             ORDER BY fecha_entrada DESC
             LIMIT 5000`
        );
        let faltas = result.rows;

        // HACK: Lo mismo para las faltas
        if (req.user.esCoordinador) {
            const idCarrera = req.user.carreras.length > 0 ? req.user.carreras[0].id : null;
            faltas = faltas.map(f => ({
                ...f,
                id_carrera: idCarrera
            }));
        }

        res.json(faltas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno' });
    }
});

export default router;