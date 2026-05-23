import pool from './src/config/db.js';

const seedAsistencias = async () => {
    try {
        console.log('Limpiando tablas de asistencia y justificativos...');
        await pool.query('TRUNCATE asistencia, justificativo CASCADE');

        console.log('Obteniendo profesores...');
        const resProfesores = await pool.query(`
            SELECT p.id_profesor, MAX(pc.dedicacion) as dedicacion 
            FROM profesor p
            LEFT JOIN profesor_carrera pc ON p.id_profesor = pc.id_profesor
            GROUP BY p.id_profesor
        `);
        const profesores = resProfesores.rows;

        if (profesores.length === 0) {
            console.log("No hay profesores registrados en la base de datos.");
            process.exit(0);
        }

        console.log(`Encontrados ${profesores.length} profesores. Generando datos desde 2025 hasta hoy...`);

        const startDate = new Date('2025-01-01T00:00:00Z');
        const endDate = new Date(); // Hoy

        let asistenciasData = [];
        let justificativosData = [];
        
        let currentIdAsistencia = 1;
        let currentIdJustificativo = 1;

        // Iterar día a día
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            // Omitir fines de semana (0 = domingo, 6 = sábado)
            if (d.getDay() === 0 || d.getDay() === 6) continue;

            const fechaStr = d.toISOString().split('T')[0];

            for (const prof of profesores) {
                // Probabilidad de tener turno este día (ej. 70%)
                if (Math.random() > 0.7) continue;

                const idAsistencia = currentIdAsistencia++;
                const rand = Math.random();

                let horaEntrada, horaSalida;
                
                const esMedioTiempo = prof.dedicacion?.toLowerCase() === 'medio tiempo';
                const esTiempoCompleto = prof.dedicacion?.toLowerCase() === 'tiempo completo';
                
                if (esMedioTiempo) {
                    horaEntrada = 14; // 2:15 PM a 9:00 PM
                    horaSalida = 18 + Math.floor(Math.random() * 3); // 18, 19, 20
                } else if (esTiempoCompleto) {
                    horaEntrada = 7 + Math.floor(Math.random() * 2); // 7:00 AM a 8:00 AM
                    horaSalida = 15 + Math.floor(Math.random() * 3); // 15, 16, 17
                } else {
                    // Estándar (aleatorio)
                    horaEntrada = 7 + Math.floor(Math.random() * 3); // 7, 8, 9
                    horaSalida = horaEntrada + 4 + Math.floor(Math.random() * 4);
                }

                const minEntrada = Math.floor(Math.random() * 60).toString().padStart(2, '0');
                const entradaStr = `${fechaStr} ${horaEntrada.toString().padStart(2, '0')}:${minEntrada}:00`;

                if (rand < 0.85) {
                    const minSalida = Math.floor(Math.random() * 60).toString().padStart(2, '0');
                    const salidaStr = `${fechaStr} ${horaSalida.toString().padStart(2, '0')}:${minSalida}:00`;

                    asistenciasData.push(`(${idAsistencia}, ${prof.id_profesor}, '${entradaStr}', '${salidaStr}')`);
                } else {
                    // 15% inasistencia (marca entrada y olvida salida)
                    asistenciasData.push(`(${idAsistencia}, ${prof.id_profesor}, '${entradaStr}', NULL)`);

                    // 60% la justifica
                    if (Math.random() < 0.6) {
                        const idJustificativo = currentIdJustificativo++;
                        const estados = ['aprobado', 'aprobado', 'pendiente', 'rechazado'];
                        const estado = estados[Math.floor(Math.random() * estados.length)];
                        
                        const motivos = ['Salud', 'Personal', 'Emergencia Familiar', 'Transporte'];
                        const motivo = motivos[Math.floor(Math.random() * motivos.length)];
                        
                        // Solicita el justificativo 1 o 2 días después, con horas y minutos aleatorios (no siempre a las 10:00:00)
                        const dJustif = new Date(d);
                        dJustif.setDate(dJustif.getDate() + 1 + Math.floor(Math.random() * 2));
                        const justHora = (8 + Math.floor(Math.random() * 10)).toString().padStart(2, '0'); // de 8 AM a 5 PM
                        const justMin = Math.floor(Math.random() * 60).toString().padStart(2, '0');
                        const fechaSoliStr = `${dJustif.toISOString().split('T')[0]} ${justHora}:${justMin}:00`;

                        justificativosData.push(`(${idJustificativo}, ${idAsistencia}, '${estado}', '${fechaSoliStr}', '${motivo}')`);
                    }
                }
            }
        }

        console.log(`Generados ${asistenciasData.length} registros de asistencia y ${justificativosData.length} justificativos.`);
        
        console.log('Insertando en base de datos en lotes...');

        // Insertar asistencias en lotes de 1000
        const batchSize = 1000;
        for (let i = 0; i < asistenciasData.length; i += batchSize) {
            const batch = asistenciasData.slice(i, i + batchSize);
            await pool.query(`INSERT INTO asistencia (id_asistencia, id_profesor, fecha_entrada, fecha_salida) VALUES ${batch.join(',')}`);
        }

        // Insertar justificativos en lotes de 1000
        for (let i = 0; i < justificativosData.length; i += batchSize) {
            const batch = justificativosData.slice(i, i + batchSize);
            await pool.query(`INSERT INTO justificativo (id_justificativo, id_asistencia, estado, fecha_solicitud, motivo) VALUES ${batch.join(',')}`);
        }

        console.log('✅ Datos insertados exitosamente.');
        
        // Actualizar secuencias
        await pool.query(`SELECT setval(pg_get_serial_sequence('asistencia', 'id_asistencia'), coalesce(max(id_asistencia), 1), max(id_asistencia) IS NOT null) FROM asistencia`);
        await pool.query(`SELECT setval(pg_get_serial_sequence('justificativo', 'id_justificativo'), coalesce(max(id_justificativo), 1), max(id_justificativo) IS NOT null) FROM justificativo`);

        process.exit(0);

    } catch (error) {
        console.error('Error al poblar datos:', error);
        process.exit(1);
    }
};

seedAsistencias();
