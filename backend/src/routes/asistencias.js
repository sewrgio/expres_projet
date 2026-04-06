import express from 'express';
import Asistencia from '../models/asistencia.js';
import QR from '../models/qr.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Escanear QR (entrada o salida automático)
router.post('/escanear', auth, async (req, res) => {
    const { codigo_qr } = req.body;

    // Verificar que sea profesor
    if (!req.user.esProfesor) {
        return res.status(403).json({ error: 'Solo profesores pueden escanear QR' });
    }

    const profesorId = req.user.id_profesor;

    try {
        // 1. Validar que el QR existe
        const qr = await QR.validar(codigo_qr);
        if (!qr) {
            return res.status(404).json({ error: 'QR inválido o inactivo' });
        }

        // 2. Verificar estado actual del profesor
        const estado = await Asistencia.verificarEstado(profesorId);
        
        let resultado;
        let tipo;

        if (estado.dentro) {
            // Está DENTRO → Registrar SALIDA
            resultado = await Asistencia.registrarSalida(profesorId, `Salida escaneada en ${qr.ubicacion || 'coordinación'}`);
            tipo = 'salida';
        } else {
            // Está FUERA → Registrar ENTRADA
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

// Obtener estado actual del profesor
router.get('/estado', auth, async (req, res) => {
    if (!req.user.esProfesor) {
        return res.status(403).json({ error: 'Acceso denegado' });
    }

    try {
        const estado = await Asistencia.verificarEstado(req.user.id_profesor);
        const asistenciasHoy = await Asistencia.obtenerAsistenciasHoy(req.user.id_profesor);

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

// Obtener historial de asistencias
router.get('/historial', auth, async (req, res) => {
    if (!req.user.esProfesor) {
        return res.status(403).json({ error: 'Acceso denegado' });
    }

    try {
        const historial = await Asistencia.obtenerHistorial(req.user.id_profesor);
        res.json(historial);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno' });
    }
});

export default router;