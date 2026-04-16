import express from 'express';
import Asistencia from '../models/asistencia.js';
import QR from '../models/qr.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Escanear QR (entrada o salida automático)
router.post('/escanear', auth, async (req, res) => {
    // Solo profesores pueden escanear QR
    if (!req.user.esProfesor) {
        return res.status(403).json({ error: 'Solo profesores pueden escanear QR' });
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
            resultado = await Asistencia.registrarSalida(profesorId, `Salida escaneada en ${qr.ubicacion || 'coordinación'}`);
            tipo = 'salida';
        } else {
            resultado = await Asistencia.registrarEntrada(profesorId, qr.id_qr, `Entrada escaneada en ${qr.ubicacion || 'coordinación'}`);
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
        const asistencias = await Asistencia.obtenerTodas();
        res.json(asistencias);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno' });
    }
});

export default router;