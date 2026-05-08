async function testRegisterCoordinador() {
  const ts = Date.now().toString().slice(-8);
  try {
    const response = await fetch('http://localhost:5000/api/coordinadores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: 'Coord',
        apellido: 'Test',
        cedula: ts,
        correo: 'coord' + ts + '@example.com',
        telefono: '123456789',
        password: 'password123',
        esCoordinador: true,
        id_carrera: 1
      })
    });
    const data = await response.json();
    if (response.ok) {
      console.log('✅ Registro coordinador exitoso:', data);
    } else {
      console.error('❌ Error registro coordinador:', data);
    }
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
  }
}

testRegisterCoordinador();
