import pool from './src/config/db.js';

const seedHorarios = async () => {
  try {
    console.log('🔍 Verificando datos existentes...');

    // Obtener asignatura_profesor activas
    const apRes = await pool.query(`
      SELECT ap.id_asignatura_profesor, ap.id_asignatura, ap.id_profesor,
             a.nombre_asignatura, a.id_carrera, c.nombre_carrera,
             u.nombre, u.apellido
      FROM asignatura_profesor ap
      JOIN asignatura a ON ap.id_asignatura = a.id_asignatura
      JOIN carrera c ON a.id_carrera = c.id_carrera
      JOIN profesor p ON ap.id_profesor = p.id_profesor
      JOIN usuario_rol ur ON p.id_usuario_rol = ur.id_usuario_rol
      JOIN usuario u ON ur.id_usuario = u.id_usuario
      WHERE ap.activo = true AND a.activo = true
    `);

    const asignaturasProfesores = apRes.rows;

    if (asignaturasProfesores.length === 0) {
      console.log('❌ No hay asignaciones de profesores a asignaturas activas.');
      console.log('💡 Primero ejecuta un script para crear asignaciones asignatura_profesor');
      process.exit(1);
    }

    console.log(`✅ Encontradas ${asignaturasProfesores.length} asignaciones activas`);

    // Limpiar horarios existentes
    console.log('🧹 Limpiando horarios existentes...');
    await pool.query('TRUNCATE horario CASCADE');

    // Bloques de horario académicos (definidos en el frontend)
    const bloquesHorario = [
      { inicio: '14:15', fin: '15:45', nombre: 'Bloque Doble 1' },
      { inicio: '15:45', fin: '17:15', nombre: 'Bloque Doble 2' },
      { inicio: '17:15', fin: '18:30', nombre: 'Bloque Doble 3' },
      { inicio: '18:30', fin: '20:00', nombre: 'Bloque Doble 4' },
      { inicio: '14:15', fin: '15:00', nombre: 'Bloque Sencillo 1' },
      { inicio: '15:00', fin: '15:45', nombre: 'Bloque Sencillo 2' },
      { inicio: '15:45', fin: '16:30', nombre: 'Bloque Sencillo 3' },
      { inicio: '16:30', fin: '17:15', nombre: 'Bloque Sencillo 4' },
      { inicio: '17:15', fin: '18:00', nombre: 'Bloque Sencillo 5' },
      { inicio: '18:00', fin: '18:45', nombre: 'Bloque Sencillo 6' },
      { inicio: '18:45', fin: '19:30', nombre: 'Bloque Sencillo 7' },
      { inicio: '19:30', fin: '20:00', nombre: 'Bloque Sencillo 8' }
    ];

    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    const aulas = ['A-101', 'A-102', 'A-103', 'A-201', 'A-202', 'A-203', 'B-101', 'B-102', 'C-101', 'Lab-1', 'Lab-2'];

    let horariosData = [];
    let currentIdHorario = 1;

    // Generar horarios para cada asignatura_profesor
    for (const ap of asignaturasProfesores) {
      // Cada asignatura tiene entre 2 y 4 bloques semanales
      const numBloques = Math.floor(Math.random() * 3) + 2; // 2-4 bloques

      // Seleccionar días aleatorios sin repetir
      const diasAsignados = [];
      while (diasAsignados.length < numBloques) {
        const diaRandom = diasSemana[Math.floor(Math.random() * diasSemana.length)];
        if (!diasAsignados.includes(diaRandom)) {
          diasAsignados.push(diaRandom);
        }
      }

      // Para cada día asignado, asignar un bloque horario
      for (const dia of diasAsignados) {
        const bloque = bloquesHorario[Math.floor(Math.random() * bloquesHorario.length)];
        const aula = aulas[Math.floor(Math.random() * aulas.length)];

        horariosData.push({
          id_horario: currentIdHorario++,
          id_asignatura_profesor: ap.id_asignatura_profesor,
          dia_semana: dia,
          hora_inicio: bloque.inicio,
          hora_fin: bloque.fin,
          aula: aula
        });

        console.log(`📚 ${ap.nombre_asignatura} - ${ap.nombre} ${ap.apellido} (${ap.nombre_carrera})`);
        console.log(`   ${dia} ${bloque.inicio}-${bloque.fin} - Aula: ${aula}`);
      }
    }

    console.log(`\n📝 Total de horarios a insertar: ${horariosData.length}`);

    // Insertar horarios
    console.log('💾 Insertando horarios en la base de datos...');
    for (const horario of horariosData) {
      await pool.query(
        `INSERT INTO horario (id_horario, id_asignatura_profesor, dia_semana, hora_inicio, hora_fin, aula)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [horario.id_horario, horario.id_asignatura_profesor, horario.dia_semana, 
         horario.hora_inicio, horario.hora_fin, horario.aula]
      );
    }

    // Actualizar secuencia
    await pool.query(
      `SELECT setval(pg_get_serial_sequence('horario', 'id_horario'), 
       coalesce(max(id_horario), 1), max(id_horario) IS NOT null) FROM horario`
    );

    console.log('✅ Horarios insertados exitosamente');
    console.log(`📊 Total horarios creados: ${horariosData.length}`);

    // Mostrar resumen por carrera
    const resumenRes = await pool.query(`
      SELECT c.nombre_carrera, COUNT(*) as total
      FROM horario h
      JOIN asignatura_profesor ap ON h.id_asignatura_profesor = ap.id_asignatura_profesor
      JOIN asignatura a ON ap.id_asignatura = a.id_asignatura
      JOIN carrera c ON a.id_carrera = c.id_carrera
      GROUP BY c.nombre_carrera
      ORDER BY total DESC
    `);

    console.log('\n📋 Resumen por carrera:');
    resumenRes.rows.forEach(row => {
      console.log(`   ${row.nombre_carrera}: ${row.total} horarios`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error al poblar horarios:', error);
    process.exit(1);
  }
};

seedHorarios();
