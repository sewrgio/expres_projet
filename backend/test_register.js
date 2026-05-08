async function testRegister() {
  const ts = Date.now().toString().slice(-8);
  try {
    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: 'Test',
        apellido: 'User',
        cedula: ts,
        correo: 'test' + ts + '@example.com',
        telefono: '123456789',
        password: 'password123',
        roles: ['profesor'],
        carreras: [1]
      })
    });
    const data = await response.json();
    if (response.ok) {
      console.log('✅ Registro exitoso:', data);
    } else {
      console.error('❌ Error en registro:', data);
    }
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
  }
}

testRegister();
