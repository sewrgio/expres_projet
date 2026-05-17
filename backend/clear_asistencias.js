import 'dotenv/config';
import pool from './src/config/db.js';

async function clearAsistencias() {
  try {
    console.log('🔄 Iniciando la limpieza de registros de asistencia...');
    
    // Eliminar todos los registros de la tabla asistencia
    const res = await pool.query('DELETE FROM asistencia');
    
    console.log(`✅ ¡Limpieza completada con éxito! Se eliminaron ${res.rowCount} registros.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al intentar limpiar los registros:', error);
    process.exit(1);
  }
}

clearAsistencias();
