import express from 'express';
import Asistencia from '../models/asistencia.js';
import QR from '../models/qr.js';
import auth from '../middleware/auth.js';
import pool from '../config/db.js';

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
router.post('/escanear', auth, async (req, res) => {
    // Permitir a profesores, coordinadores y auditores
    if (!req.user.esProfesor && !req.user.esCoordinador && req.user.rol !== 'auditor') {
        return res.status(403).json({ error: 'No tienes permiso para escanear QR' });
    }

    const { codigo_qr } = req.body;

    if (!codigo_qr) {
        return res.status(400).json({ error: 'El código QR es requerido' });
    }

    // Validación de horario (7:00 AM a 9:00 PM)
    const horaActual = new Date().getHours();
    if (horaActual < 7 || horaActual >= 21) {
        return res.status(400).json({ 
            success: false, 
            error: 'El horario de escaneo es solo de 7:00 AM a 9:00 PM' 
        });
    }

    const profesorId = req.user.id_profesor;

    try {
        const qr = await QR.validar(codigo_qr);
        if (!qr) {
            return res.status(404).json({ error: 'QR inválido o inactivo' });
        }

        const estado = await Asistencia.verificarEstado(profesorId);
        
        let resultado;
        let tipo;

        if (estado.dentro) {
            resultado = await Asistencia.registrarSalida(profesorId);
            tipo = 'salida';
        } else {
            resultado = await Asistencia.registrarEntrada(profesorId, qr.id_qr);
            tipo = 'entrada';
        }

        res.json({
            success: true,
            tipo: tipo,
            message: tipo === 'entrada' ? '✅ Entrada registrada' : '✅ Salida registrada',
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

// ✅ NUEVO: Obtener todas las asistencias (solo coordinador)
router.get('/todas', auth, async (req, res) => {
    if (!req.user.esCoordinador) {
        return res.status(403).json({ error: 'Solo coordinadores pueden ver todas las asistencias' });
    }

    try {
        let asistencias = await Asistencia.obtenerTodas();
        
        // HACK: Para que el coordinador vea a TODOS los profesores (5000), 
        // sobreescribimos el id_carrera con el suyo para saltar el filtro del frontend
        if (req.user.esCoordinador) {
            asistencias = asistencias.map(a => ({
                ...a,
                id_carrera: req.user.id_carrera
            }));
        }
        
        res.json(asistencias);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// ✅ NUEVO: Obtener asistencias por profesor
router.get('/profesor/:idProfesor', auth, async (req, res) => {
    if (!req.user.esCoordinador && req.user.rol !== 'auditor') {
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

// ✅ NUEVO: Obtener faltas/inasistencias (para auditor/coordinador)
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
            faltas = faltas.map(f => ({
                ...f,
                id_carrera: req.user.id_carrera
            }));
        }

        res.json(faltas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno' });
    }
});

export default router;