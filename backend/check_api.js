import jwt from 'jsonwebtoken';
import fs from 'fs';

async function test() {
  try {
    const secret = 'iujo_clave_secreta_2026';
    const token = jwt.sign({ id: 6, roles: ['auditor'] }, secret, { expiresIn: '1h' });
    console.log("Generated token:", token);

    // Make request to GET /api/usuarios
    const res = await fetch('http://localhost:5000/api/usuarios', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      fs.writeFileSync('usuarios_api_debug.json', JSON.stringify({ error: true, status: res.status, body: errText }, null, 2));
      console.error("API error status:", res.status, errText);
      process.exit(1);
    }

    const data = await res.json();
    fs.writeFileSync('usuarios_api_debug.json', JSON.stringify(data, null, 2));
    console.log("SUCCESS: API returned " + data.length + " users. Wrote to usuarios_api_debug.json");
    process.exit(0);
  } catch (error) {
    fs.writeFileSync('usuarios_api_debug.json', JSON.stringify({ error: error.message, stack: error.stack }, null, 2));
    console.error(error);
    process.exit(1);
  }
}

test();
