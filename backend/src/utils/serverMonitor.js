import fs from 'fs';
import path from 'path';
import pool from '../config/db.js';

const statusFilePath = path.resolve('/home/sergio/Documentos/expres_projet/backend/src/utils/server_status.json');
const exportDir = '/home/sergio/Documentos/expres_projet/exports';

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
    const exportStatusPath = path.resolve('/home/sergio/Documentos/expres_projet/backend/src/utils/export_status.json');
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

    // 6. Registrar la acción de exportación en la propia bitácora
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
