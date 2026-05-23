import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rutas dinámicas multiplataforma (Linux / Windows)
const backendRoot = path.resolve(__dirname, '../../');
const projectRoot = path.resolve(backendRoot, '../');

const statusFilePath = path.join(__dirname, 'server_status.json');
const exportDir = path.join(projectRoot, 'exports');

// Helper para dar formato legible a duraciones
function formatDuration(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts = [];
  if (days > 0) parts.push(`${days} día(s)`);
  if (hours > 0) parts.push(`${hours} hora(s)`);
  if (minutes > 0) parts.push(`${minutes} minuto(s)`);
  if (seconds > 0) parts.push(`${seconds} segundo(s)`);

  return parts.join(', ') || '0 segundos';
}

/**
 * Inicializa el monitoreo de caídas y levantadas del servidor
 */
export async function iniciarMonitoreoServidor() {
  try {
    const ahora = new Date();
    let anteriorEstado = null;

    // Leer estado anterior si existe
    if (fs.existsSync(statusFilePath)) {
      try {
        anteriorEstado = JSON.parse(fs.readFileSync(statusFilePath, 'utf8'));
      } catch (err) {
        console.error('⚠️ Error al leer server_status.json:', err);
      }
    }

    if (anteriorEstado) {
      const lastHeartbeat = new Date(anteriorEstado.last_heartbeat);
      const downtimeMs = ahora.getTime() - lastHeartbeat.getTime();
      const tiempoDeCaida = formatDuration(downtimeMs);

      const horaCaidaStr = lastHeartbeat.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const fechaCaidaStr = lastHeartbeat.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
      const horaLevantadaStr = ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      if (anteriorEstado.status === 'running') {
        // Caída abrupta (crashed/killed)
        console.log(`⚠️ Sistema detectó una caída abrupta previa a las ${horaCaidaStr} (${fechaCaidaStr})`);
        
        await pool.query(
          `INSERT INTO bitacora_logs (id_usuario, accion, detalles, fecha) 
           VALUES (NULL, $1, $2, CURRENT_TIMESTAMP)`,
          [
            'SISTEMA_FALLO_CAIDA',
            `Fallo del Sistema detectado: El servidor se cayó de forma abrupta a las ${horaCaidaStr} (${fechaCaidaStr}). Se levantó exitosamente a las ${horaLevantadaStr}. Tiempo total fuera de servicio (caída): ${tiempoDeCaida}.`
          ]
        );
      } else if (anteriorEstado.status === 'stopped') {
        // Apagado programado/controlado
        const shutdownTime = anteriorEstado.shutdown_time ? new Date(anteriorEstado.shutdown_time) : lastHeartbeat;
        const shutdownDowntimeMs = ahora.getTime() - shutdownTime.getTime();
        const tiempoDeApagado = formatDuration(shutdownDowntimeMs);
        const horaApagadoStr = shutdownTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const fechaApagadoStr = shutdownTime.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });

        console.log(`🔄 Sistema levantado tras parada programada previa a las ${horaApagadoStr}`);

        await pool.query(
          `INSERT INTO bitacora_logs (id_usuario, accion, detalles, fecha) 
           VALUES (NULL, $1, $2, CURRENT_TIMESTAMP)`,
          [
            'SISTEMA_REINICIO',
            `Reinicio programado: El servidor se levantó a las ${horaLevantadaStr} tras una parada controlada a las ${horaApagadoStr} (${fechaApagadoStr}). Tiempo de inactividad: ${tiempoDeApagado}.`
          ]
        );
      }
    } else {
      // Primer arranque histórico
      await pool.query(
        `INSERT INTO bitacora_logs (id_usuario, accion, detalles, fecha) 
         VALUES (NULL, $1, $2, CURRENT_TIMESTAMP)`,
        [
          'SISTEMA_INICIO',
          `Primer inicio del servidor registrado a las ${ahora.toLocaleTimeString()}. El sistema se encuentra totalmente operativo.`
        ]
      );
    }

    // Registrar estado de arranque actual
    actualizarEstadoMonitor('running');

    // Iniciar Intervalo de Heartbeat (latido cada 10 segundos)
    setInterval(() => {
      actualizarEstadoMonitor('running');
      verificarYEjecutarExportMensual(); // Verificar exportación automática
      ejecutarChequeoProfundoMensual(); // Verificar chequeo profundo invisible (30 días)
    }, 10000);

    // Configurar apagado controlado/señales del sistema
    setupSignalHandlers();

  } catch (error) {
    console.error('❌ Error en el inicializador del monitor de servidor:', error);
  }
}

/**
 * Actualiza el archivo local server_status.json
 */
function actualizarEstadoMonitor(status, extraData = {}) {
  try {
    const data = {
      status,
      last_heartbeat: new Date(),
      ...extraData
    };
    fs.writeFileSync(statusFilePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('⚠️ No se pudo escribir server_status.json:', err);
  }
}

/**
 * Configura los manejadores de eventos del proceso para registrar apagados ordenados
 */
function setupSignalHandlers() {
  const gracefulShutdown = (signal) => {
    console.log(`\n🛑 Recibida señal ${signal}. Apagando servidor de forma ordenada...`);
    actualizarEstadoMonitor('stopped', { shutdown_time: new Date() });
    
    // Registrar el evento de apagado controlado en la bitácora
    pool.query(
      `INSERT INTO bitacora_logs (id_usuario, accion, detalles, fecha) 
       VALUES (NULL, $1, $2, CURRENT_TIMESTAMP)`,
      [
        'SISTEMA_APAGADO',
        `El servidor del sistema se detuvo de forma ordenada a las ${new Date().toLocaleTimeString()} por señal de mantenimiento o apagado (${signal}).`
      ]
    ).then(() => {
      process.exit(0);
    }).catch((err) => {
      console.error('Error al registrar parada en base de datos:', err);
      process.exit(0);
    });
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  
  process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception detectada:', err);
    actualizarEstadoMonitor('running', { last_heartbeat: new Date() }); // Mantener como running para indicar que crashó
    process.exit(1);
  });
}

/**
 * Verifica si es fin de mes y realiza la exportación automática de la bitácora a .txt
 */
export async function verificarYEjecutarExportMensual(forzar = false) {
  try {
    const ahora = new Date();
    
    // 1. Validar si hoy es el último día del mes
    const manana = new Date(ahora);
    manana.setDate(ahora.getDate() + 1);
    const esUltimoDiaDelMes = manana.getMonth() !== ahora.getMonth();

    if (!esUltimoDiaDelMes && !forzar) return;

    // Identificador único del mes para evitar duplicados (ej: "2026-05")
    const mesId = `${ahora.getFullYear()}-${(ahora.getMonth() + 1).toString().padStart(2, '0')}`;
    
    // Cargar registro de exportación
    let exportStatus = {};
    const exportStatusPath = path.join(__dirname, 'export_status.json');
    if (fs.existsSync(exportStatusPath)) {
      try {
        exportStatus = JSON.parse(fs.readFileSync(exportStatusPath, 'utf8'));
      } catch (e) {}
    }

    // Si ya se exportó este mes y no es forzado, omitir
    if (exportStatus.last_exported_month === mesId && !forzar) return;

    console.log(`📅 Fin de mes detectado (${mesId}). Iniciando exportación automática de la bitácora a TXT...`);

    // Asegurar que el directorio de exportación exista
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // 2. Obtener todos los registros de la bitácora
    const res = await pool.query(
      `SELECT b.fecha, b.accion, b.detalles, 
              u.nombre, u.apellido, u.correo, u.rol
       FROM bitacora_logs b
       LEFT JOIN usuario u ON b.id_usuario = u.id_usuario
       ORDER BY b.fecha ASC`
    );

    const logs = res.rows;
    const nombresMeses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const nombreMes = nombresMeses[ahora.getMonth()];
    const fileName = `bitacora_${nombreMes}_${ahora.getFullYear()}.txt`;
    const filePath = path.join(exportDir, fileName);

    // 3. Formatear reporte de texto
    let content = `================================================================================
📜 REPORTE MENSUAL AUTOMÁTICO DE BITÁCORA Y AUDITORÍA - IUJO ESCANNER
================================================================================
Mes Reportado: ${nombreMes} de ${ahora.getFullYear()}
Fecha de Exportación: ${ahora.toLocaleString()}
Total Transacciones: ${logs.length}
================================================================================

`;

    logs.forEach((log, index) => {
      const fecha = new Date(log.fecha).toLocaleString();
      const operador = log.correo 
        ? `${log.nombre} ${log.apellido} (${log.correo}) [Rol: ${JSON.stringify(log.rol)}]`
        : 'SISTEMA AUTOMÁTICO';

      content += `[REGISTRO #${index + 1}]
📅 FECHA/HORA: ${fecha}
🏷️ ACCIÓN: ${log.accion}
👤 OPERADOR: ${operador}
📋 DETALLES: ${log.detalles || 'Sin detalles'}
--------------------------------------------------------------------------------
`;
    });

    content += `\n*** FIN DEL REPORTE AUTOMÁTICO - IUJO ESCANNER ***\n`;

    // 4. Escribir archivo de texto
    fs.writeFileSync(filePath, content, 'utf8');

    // 5. Guardar estado para no duplicar este mes
    exportStatus.last_exported_month = mesId;
    exportStatus.last_exported_date = ahora;
    fs.writeFileSync(exportStatusPath, JSON.stringify(exportStatus, null, 2), 'utf8');

    console.log(`✅ Bitácora exportada exitosamente a: ${filePath}`);

    // Registrar la acción de exportación en la propia bitácora
    await pool.query(
      `INSERT INTO bitacora_logs (id_usuario, accion, detalles, fecha) 
       VALUES (NULL, $1, $2, CURRENT_TIMESTAMP)`,
      [
        'EXPORTACION_AUTOMATICA',
        `Exportación Mensual Automática: La bitácora del mes de ${nombreMes} fue exportada de forma exitosa a un archivo .txt en: ${filePath}. Total de logs exportados: ${logs.length}.`
      ]
    );

  } catch (error) {
    console.error('❌ Error al realizar la exportación automática de bitácora:', error);
  }
}

/**
 * Realiza un chequeo profundo de todo el sistema cada 30 días y lo guarda en un archivo JSON invisible (.system_deep_check.json)
 */
export async function ejecutarChequeoProfundoMensual(forzar = false) {
  try {
    const deepCheckStatusFilePath = path.join(backendRoot, '.deep_check_status.json');
    const outputFilePath = path.join(backendRoot, '.system_deep_check.json');
    const ahora = new Date();

    let lastRun = 0;
    if (fs.existsSync(deepCheckStatusFilePath)) {
      try {
        const status = JSON.parse(fs.readFileSync(deepCheckStatusFilePath, 'utf8'));
        lastRun = new Date(status.last_run).getTime();
      } catch (e) {}
    }

    const treintaDiasMs = 30 * 24 * 60 * 60 * 1000; // 30 días en milisegundos
    
    // Si no han pasado 30 días y no es forzado, omitir
    if (ahora.getTime() - lastRun < treintaDiasMs && !forzar) {
      return;
    }

    console.log(`🕵️‍♂️ Iniciando Chequeo Profundo del Sistema (Auditoría 30 días)...`);

    // Recopilar información de toda la infraestructura
    const usuarios = await pool.query('SELECT * FROM usuario');
    const profesores = await pool.query('SELECT * FROM profesor');
    const horarios = await pool.query('SELECT * FROM horario');
    const bitacora = await pool.query('SELECT * FROM bitacora_logs ORDER BY fecha DESC LIMIT 5000');
    const asistencias = await pool.query('SELECT * FROM asistencia ORDER BY fecha_entrada DESC LIMIT 5000');

    // Extraer anomalías, caídas o bloqueos de los últimos registros
    const anomalias = bitacora.rows.filter(log => 
      log.accion.includes('FALLO') || 
      log.accion.includes('ERROR') || 
      log.accion.includes('BLOQUEO')
    );

    const sistemaData = {
      _warning: "ESTE ES UN ARCHIVO DE AUDITORÍA INVISIBLE GENERADO AUTOMÁTICAMENTE. NO MODIFICAR.",
      metadata: {
        fecha_chequeo_utc: ahora.toISOString(),
        fecha_chequeo_local: ahora.toLocaleString(),
        proximo_chequeo_estimado: new Date(ahora.getTime() + treintaDiasMs).toISOString(),
        estadisticas: {
          total_usuarios: usuarios.rowCount,
          total_profesores_nomina: profesores.rowCount,
          total_bloques_horarios: horarios.rowCount,
          alertas_criticas_y_bloqueos_detectados: anomalias.length
        }
      },
      anomalias_detectadas: anomalias,
      usuarios_registrados: usuarios.rows,
      horarios_activos: horarios.rows,
      profesores_activos: profesores.rows,
      ultimas_5000_asistencias: asistencias.rows
    };

    // 1. Configurar encriptación AES-256-CBC
    const algorithm = 'aes-256-cbc';
    // Usar la llave JWT del entorno o un fallback fuerte si no existe
    const rawKey = process.env.JWT_SECRET || 'llave_super_secreta_de_respaldo_iujo_2026';
    const secretKey = crypto.scryptSync(rawKey, 'salt', 32); 
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    let encrypted = cipher.update(JSON.stringify(sistemaData), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const finalPayload = {
      _warning: "SYSTEM VAULT ENCRYPTED AUDIT. DECRYPTION KEY REQUIRED.",
      iv: iv.toString('hex'),
      data: encrypted
    };

    // 2. Crear Bóveda Invisible multiplataforma
    const vaultDir = path.join(backendRoot, '.sys_vault');
    if (!fs.existsSync(vaultDir)) {
      fs.mkdirSync(vaultDir, { recursive: true, mode: 0o700 }); 
      
      // Si estamos en Windows Server, aplicar atributo nativo de sistema 'Hidden'
      if (os.platform() === 'win32') {
        exec(`attrib +h "${vaultDir}"`, (err) => {
          if (err) console.error('⚠️ No se pudo ocultar la bóveda en Windows:', err);
        });
      }
    }

    const encryptedOutputFilePath = path.join(vaultDir, '.system_deep_check.enc.json');
    
    // 3. Escribir el archivo invisible encriptado (modo 0600: solo lectura/escritura para dueño rw-------)
    fs.writeFileSync(encryptedOutputFilePath, JSON.stringify(finalPayload, null, 2), { encoding: 'utf8', mode: 0o600 });

    // Actualizar el archivo de estado de ejecución
    fs.writeFileSync(deepCheckStatusFilePath, JSON.stringify({ last_run: ahora.toISOString() }, null, 2), 'utf8');

    console.log(`✅ Chequeo profundo completado. Datos críticos encriptados (AES-256) y respaldados en bóveda de seguridad invisible.`);

  } catch (error) {
    console.error('❌ Error crítico al ejecutar el chequeo profundo:', error);
  }
}
