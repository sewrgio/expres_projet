import pool from './src/config/db.js';

const seedAsignaturasProfesores = async () => {
  try {
    console.log('🔍 Verificando datos existentes...');

    // Obtener carreras
    const carrerasRes = await pool.query('SELECT id_carrera, nombre_carrera FROM carrera WHERE activo = true ORDER BY id_carrera');
    const carreras = carrerasRes.rows;

    // Obtener profesores con su carrera
    const profesoresRes = await pool.query(`
      SELECT p.id_profesor, u.nombre, u.apellido, pc.id_carrera
      FROM profesor p
      JOIN usuario_rol ur ON p.id_usuario_rol = ur.id_usuario_rol
      JOIN usuario u ON ur.id_usuario = u.id_usuario
      LEFT JOIN profesor_carrera pc ON p.id_profesor = pc.id_profesor
      ORDER BY pc.id_carrera, p.id_profesor
    `);
    const profesores = profesoresRes.rows;

    // Obtener asignaturas existentes
    const asignaturasRes = await pool.query('SELECT id_asignatura, id_carrera, nombre_asignatura FROM asignatura WHERE activo = true ORDER BY id_carrera');
    const asignaturasExistentes = asignaturasRes.rows;

    console.log(`✅ Carreras: ${carreras.length}`);
    console.log(`✅ Profesores: ${profesores.length}`);
    console.log(`✅ Asignaturas existentes: ${asignaturasExistentes.length}`);

    // Asignaturas típicas por carrera
    const asignaturasPorCarrera = {
      2: ['Algoritmos', 'Estructuras de Datos', 'Bases de Datos', 'Programación Web', 'Sistemas Operativos', 'Redes de Computadores', 'Ingeniería de Software', 'Inteligencia Artificial'],
      3: ['Circuitos Eléctricos', 'Electrónica Digital', 'Sistemas de Control', 'Electrónica Analógica', 'Microprocesadores', 'Telecomunicaciones', 'Instrumentación', 'Robótica'],
      4: ['Contabilidad General', 'Costos', 'Finanzas', 'Economía', 'Estadística', 'Derecho Mercantil', 'Gestión de Empresas', 'Marketing'],
      5: ['Auditoría', 'Impuestos', 'Contabilidad Avanzada', 'Sistemas Contables', 'Finanzas Corporativas', 'Presupuesto', 'Análisis Financiero', 'Ética Profesional'],
      6: ['Pedagogía', 'Psicología Educativa', 'Didáctica', 'Evaluación', 'Currículo', 'Sociología', 'Filosofía de la Educación', 'Orientación'],
      7: ['Desarrollo Infantil', 'Psicomotricidad', 'Lenguaje y Comunicación', 'Expresión Artística', 'Juego y Aprendizaje', 'Salud Infantil', 'Familia y Comunidad', 'Matemáticas Iniciales']
    };

    // Desactivar asignaciones anteriores
    console.log('🧹 Desactivando asignaciones profesor-asignatura anteriores...');
    await pool.query('UPDATE asignatura_profesor SET activo = false WHERE activo = true');

    let nuevasAsignaturas = [];
    let nuevasAsignaciones = [];
    let currentIdAsignatura = 1;
    let currentIdAsignacion = 1;

    // Obtener el máximo ID actual
    const maxAsigRes = await pool.query('SELECT COALESCE(MAX(id_asignatura), 0) as max_id FROM asignatura');
    currentIdAsignatura = maxAsigRes.rows[0].max_id + 1;

    const maxApRes = await pool.query('SELECT COALESCE(MAX(id_asignatura_profesor), 0) as max_id FROM asignatura_profesor');
    currentIdAsignacion = maxApRes.rows[0].max_id + 1;

    // Para cada carrera
    for (const carrera of carreras) {
      const idCarrera = carrera.id_carrera;
      const nombreCarrera = carrera.nombre_carrera.trim();

      console.log(`\n📚 Procesando carrera: ${nombreCarrera} (ID: ${idCarrera})`);

      // Obtener profesores de esta carrera
      const profesoresCarrera = profesores.filter(p => p.id_carrera === idCarrera);

      if (profesoresCarrera.length === 0) {
        console.log(`   ⚠️  No hay profesores asignados a esta carrera`);
        continue;
      }

      console.log(`   👨‍🏫 Profesores disponibles: ${profesoresCarrera.length}`);

      // Obtener asignaturas existentes de esta carrera
      const asignaturasCarrera = asignaturasExistentes.filter(a => a.id_carrera === idCarrera);
      const asignaturasNombres = asignaturasCarrera.map(a => a.nombre_asignatura.trim().toLowerCase());

      // Obtener asignaturas típicas para esta carrera
      const asignaturasTipicas = asignaturasPorCarrera[idCarrera] || [];

      // Crear asignaturas faltantes
      for (const nombreAsignatura of asignaturasTipicas) {
        if (!asignaturasNombres.includes(nombreAsignatura.toLowerCase())) {
          nuevasAsignaturas.push({
            id_asignatura: currentIdAsignatura,
            id_carrera: idCarrera,
            nombre_asignatura: nombreAsignatura
          });
          console.log(`   ➕ Nueva asignatura: ${nombreAsignatura}`);
          currentIdAsignatura++;
        }
      }

      // Asignar profesores a todas las asignaturas de la carrera
      const todasAsignaturasCarrera = [
        ...asignaturasCarrera,
        ...nuevasAsignaturas.filter(a => a.id_carrera === idCarrera)
      ];

      for (const asignatura of todasAsignaturasCarrera) {
        // Asignar un profesor aleatorio de la carrera
        const profesorRandom = profesoresCarrera[Math.floor(Math.random() * profesoresCarrera.length)];

        nuevasAsignaciones.push({
          id_asignatura_profesor: currentIdAsignacion,
          id_asignatura: asignatura.id_asignatura,
          id_profesor: profesorRandom.id_profesor,
          fecha_desde: new Date().toISOString().split('T')[0]
        });

        console.log(`   🔗 ${asignatura.nombre_asignatura} -> ${profesorRandom.nombre} ${profesorRandom.apellido}`);
        currentIdAsignacion++;
      }
    }

    // Insertar nuevas asignaturas
    if (nuevasAsignaturas.length > 0) {
      console.log(`\n💾 Insertando ${nuevasAsignaturas.length} nuevas asignaturas...`);
      for (const asig of nuevasAsignaturas) {
        await pool.query(
          'INSERT INTO asignatura (id_asignatura, id_carrera, nombre_asignatura, activo) VALUES ($1, $2, $3, true)',
          [asig.id_asignatura, asig.id_carrera, asig.nombre_asignatura]
        );
      }
    }

    // Insertar nuevas asignaciones
    if (nuevasAsignaciones.length > 0) {
      console.log(`💾 Insertando ${nuevasAsignaciones.length} asignaciones profesor-asignatura...`);
      for (const ap of nuevasAsignaciones) {
        await pool.query(
          'INSERT INTO asignatura_profesor (id_asignatura_profesor, id_asignatura, id_profesor, fecha_desde, activo) VALUES ($1, $2, $3, $4, true)',
          [ap.id_asignatura_profesor, ap.id_asignatura, ap.id_profesor, ap.fecha_desde]
        );
      }
    }

    // Actualizar secuencias
    await pool.query(
      `SELECT setval(pg_get_serial_sequence('asignatura', 'id_asignatura'), 
       coalesce(max(id_asignatura), 1), max(id_asignatura) IS NOT null) FROM asignatura`
    );

    await pool.query(
      `SELECT setval(pg_get_serial_sequence('asignatura_profesor', 'id_asignatura_profesor'), 
       coalesce(max(id_asignatura_profesor), 1), max(id_asignatura_profesor) IS NOT null) FROM asignatura_profesor`
    );

    console.log('\n✅ Proceso completado exitosamente');
    console.log(`📊 Nuevas asignaturas creadas: ${nuevasAsignaturas.length}`);
    console.log(`📊 Asignaciones profesor-asignatura creadas: ${nuevasAsignaciones.length}`);

    // Mostrar resumen por carrera
    const resumenRes = await pool.query(`
      SELECT c.id_carrera, c.nombre_carrera, COUNT(DISTINCT a.id_asignatura) as asignaturas, 
             COUNT(DISTINCT ap.id_asignatura_profesor) as asignaciones
      FROM carrera c
      LEFT JOIN asignatura a ON c.id_carrera = a.id_carrera AND a.activo = true
      LEFT JOIN asignatura_profesor ap ON a.id_asignatura = ap.id_asignatura AND ap.activo = true
      WHERE c.activo = true
      GROUP BY c.id_carrera, c.nombre_carrera
      ORDER BY c.id_carrera
    `);

    console.log('\n📋 Resumen por carrera:');
    resumenRes.rows.forEach(row => {
      console.log(`   ${row.nombre_carrera}: ${row.asignaturas} asignaturas, ${row.asignaciones} asignaciones`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error al poblar asignaturas y asignaciones:', error);
    process.exit(1);
  }
};

seedAsignaturasProfesores();
