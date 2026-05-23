import pool from './src/config/db.js';

async function generateHistoricalData() {
  try {
    console.log('🔄 Generando datos históricos desde enero 2025 hasta hoy...');
    console.log('✅ Conectado a la base de datos');

    // Obtener profesores regulares de todas las carreras
    const profesoresRes = await pool.query(`
      SELECT p.id_profesor, u.nombre, u.apellido, pc.id_carrera, car.nombre_carrera
      FROM profesor p
      JOIN usuario_rol ur ON p.id_usuario_rol = ur.id_usuario_rol
      JOIN usuario u ON ur.id_usuario = u.id_usuario
      LEFT JOIN profesor_carrera pc ON p.id_profesor = pc.id_profesor AND pc.activo = true
      LEFT JOIN carrera car ON pc.id_carrera = car.id_carrera
      WHERE NOT (u.rol @> '"coordinador"'::jsonb OR u.rol @> '"adjunto coordinacion"'::jsonb)
        AND pc.id_carrera IS NOT NULL
    `);
    const profesores = profesoresRes.rows;
    console.log(`📊 ${profesores.length} profesores regulares encontrados`);

    // Obtener fechas que ya tienen datos para evitar duplicados
    const existingDatesRes = await pool.query(`
      SELECT DISTINCT DATE(fecha_entrada) as fecha 
      FROM asistencia 
      WHERE fecha_entrada >= '2025-01-01'
    `);
    const existingDates = new Set(existingDatesRes.rows.map(row => row.fecha.toISOString().split('T')[0]));
    console.log(`📅 ${existingDates.size} fechas ya tienen datos`);

    // Obtener combinaciones profesor-fecha que ya existen para evitar duplicados
    const existingProfesorFechaRes = await pool.query(`
      SELECT DISTINCT id_profesor, DATE(fecha_entrada) as fecha 
      FROM asistencia 
      WHERE fecha_entrada >= '2025-01-01'
    `);
    const existingProfesorFecha = new Set(
      existingProfesorFechaRes.rows.map(row => `${row.id_profesor}-${row.fecha.toISOString().split('T')[0]}`)
    );
    console.log(`📊 ${existingProfesorFecha.size} registros profesor-fecha ya existen`);

    // Fechas desde enero 2025 hasta hoy
    const startDate = new Date('2025-01-01');
    const endDate = new Date();
    const currentDate = new Date(startDate);

    // Obtener el siguiente ID disponible
    const maxAsistenciaId = await pool.query('SELECT COALESCE(MAX(id_asistencia), 0) + 1 as next_id FROM asistencia');
    const maxJustificativoId = await pool.query('SELECT COALESCE(MAX(id_justificativo), 0) + 1 as next_id FROM justificativo');
    
    let asistenciaId = maxAsistenciaId.rows[0].next_id;
    let justificativoId = maxJustificativoId.rows[0].next_id;

    // Generar datos para cada día
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay(); // 0 = domingo, 6 = sábado
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Solo días laborables (lunes a viernes) y que no tienen datos
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        if (existingDates.has(dateStr)) {
          console.log(`⏭️  Saltando ${dateStr} - ya tiene datos`);
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }
        
        // Preparar datos para insertar en batch
        const asistenciasToInsert = [];
        const justificativosToInsert = [];
        let profesoresSaltados = 0;
        
        for (const profesor of profesores) {
          // Saltar si este profesor ya tiene datos para esta fecha
          const profesorFechaKey = `${profesor.id_profesor}-${dateStr}`;
          if (existingProfesorFecha.has(profesorFechaKey)) {
            profesoresSaltados++;
            continue;
          }

          // Probabilidad de asistencia: 85%
          const probabilidadAsistencia = Math.random();
          
          if (probabilidadAsistencia < 0.85) {
            // Asistencia completa (2 registros: entrada y salida)
            const horaEntrada = 7 + Math.floor(Math.random() * 2); // 7-9 AM
            const minutoEntrada = Math.floor(Math.random() * 60);
            const horaSalida = 17 + Math.floor(Math.random() * 3); // 5-8 PM
            const minutoSalida = Math.floor(Math.random() * 60);
            
            const fechaEntrada = new Date(currentDate);
            fechaEntrada.setHours(horaEntrada, minutoEntrada, 0, 0);
            
            const fechaSalida = new Date(currentDate);
            fechaSalida.setHours(horaSalida, minutoSalida, 0, 0);
            
            // Registro de entrada
            asistenciasToInsert.push({
              id_asistencia: asistenciaId++,
              id_profesor: profesor.id_profesor,
              id_qr: null,
              fecha_entrada: fechaEntrada,
              fecha_salida: fechaSalida
            });
            
            // Registro de salida (segundo registro del mismo día)
            asistenciasToInsert.push({
              id_asistencia: asistenciaId++,
              id_profesor: profesor.id_profesor,
              id_qr: null,
              fecha_entrada: fechaSalida,
              fecha_salida: null
            });
          } else {
            // Inasistencia (solo entrada, sin salida)
            const horaEntrada = 7 + Math.floor(Math.random() * 2);
            const minutoEntrada = Math.floor(Math.random() * 60);
            
            const fechaEntrada = new Date(currentDate);
            fechaEntrada.setHours(horaEntrada, minutoEntrada, 0, 0);
            
            const asistenciaIdActual = asistenciaId++;
            asistenciasToInsert.push({
              id_asistencia: asistenciaIdActual,
              id_profesor: profesor.id_profesor,
              id_qr: null,
              fecha_entrada: fechaEntrada,
              fecha_salida: null
            });
            
            // Probabilidad de justificativo: 30%
            if (Math.random() < 0.3) {
              const motivos = ['Cita Médica', 'Asuntos Familiares', 'Trámites Personales', 'Enfermedad', 'Emergencia Familiar'];
              const motivo = motivos[Math.floor(Math.random() * motivos.length)];
              const estados = ['aprobado', 'rechazado', 'pendiente'];
              const estado = estados[Math.floor(Math.random() * estados.length)];
              
              justificativosToInsert.push({
                id_justificativo: justificativoId++,
                id_asistencia: asistenciaIdActual,
                motivo: motivo,
                estado: estado,
                documento_url: '/uploads/justificativos/ejemplo.pdf',
                fecha_solicitud: fechaEntrada
              });
            }
          }
        }
        
        // Insertar asistencias en batch
        if (asistenciasToInsert.length > 0) {
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            for (const asistencia of asistenciasToInsert) {
              await client.query(
                `INSERT INTO asistencia (id_asistencia, id_profesor, id_qr, fecha_entrada, fecha_salida)
                 VALUES ($1, $2, NULL, $3, $4)`,
                [asistencia.id_asistencia, asistencia.id_profesor, asistencia.fecha_entrada, asistencia.fecha_salida]
              );
            }
            await client.query('COMMIT');
          } catch (error) {
            await client.query('ROLLBACK');
            throw error;
          } finally {
            client.release();
          }
        }
        
        // Insertar justificativos en batch
        if (justificativosToInsert.length > 0) {
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            for (const justificativo of justificativosToInsert) {
              await client.query(
                `INSERT INTO justificativo (id_justificativo, id_asistencia, motivo, estado, documento_url, fecha_solicitud)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [justificativo.id_justificativo, justificativo.id_asistencia, justificativo.motivo, justificativo.estado, justificativo.documento_url, justificativo.fecha_solicitud]
              );
            }
            await client.query('COMMIT');
          } catch (error) {
            await client.query('ROLLBACK');
            throw error;
          } finally {
            client.release();
          }
        }
        
        console.log(`✅ Datos generados para ${dateStr} (${asistenciasToInsert.length} asistencias, ${justificativosToInsert.length} justificativos, ${profesoresSaltados} profesores saltados)`);
      }
      
      // Avanzar un día
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log('🎉 Datos históricos generados exitosamente');
    console.log(`📊 Total asistencias: ${asistenciaId - 1}`);
    console.log(`📊 Total justificativos: ${justificativoId - 1}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error generando datos históricos:', error);
    process.exit(1);
  }
}

generateHistoricalData();
