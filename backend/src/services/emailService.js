import nodemailer from 'nodemailer';

// No llamamos dotenv.config() aquí porque server.js ya lo carga con import 'dotenv/config'
// Las variables process.env.EMAIL_USER y process.env.EMAIL_PASS ya están disponibles

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verificar la conexión SMTP al iniciar
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Error SMTP:', error.message);
  } else {
    console.log('✅ Correo listo — usuario:', process.env.EMAIL_USER);
  }
});

export const sendVerificationEmail = async (email, nombre, token) => {
  const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;

  const info = await transporter.sendMail({
    from: `"IUJO Asistencia" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Confirma tu correo electrónico - IUJO',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;padding:40px;border-radius:12px;background:#fff;">
        <h1 style="color:#1e3c72;text-align:center;">¡Bienvenido al IUJO!</h1>
        <p style="font-size:16px;color:#333;">Hola <strong>${nombre}</strong>,</p>
        <p style="font-size:16px;color:#333;">Para activar tu cuenta, haz clic en el botón:</p>
        <div style="text-align:center;margin:40px 0;">
          <a href="${url}" style="background:#3498db;color:#fff;padding:14px 30px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">Confirmar mi cuenta</a>
        </div>
        <p style="font-size:12px;color:#7f8c8d;text-align:center;">Si el botón no funciona: <a href="${url}">${url}</a></p>
      </div>
    `,
  });
  console.log('📧 Verificación enviada:', info.messageId);
  return info;
};

export const sendRecoveryCode = async (email, code) => {
  const info = await transporter.sendMail({
    from: `"IUJO Seguridad" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Código de recuperación - IUJO',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;padding:40px;border-radius:12px;background:#fff;">
        <h2 style="color:#1e3c72;text-align:center;">Recuperación de Contraseña</h2>
        <p style="font-size:16px;color:#333;">Tu código de seguridad es:</p>
        <div style="text-align:center;margin:40px 0;">
          <div style="display:inline-block;background:#f8f9fa;padding:20px 40px;border-radius:12px;border:2px dashed #3498db;">
            <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#2c3e50;">${code}</span>
          </div>
        </div>
        <p style="font-size:14px;color:#e74c3c;font-weight:bold;">Si no solicitaste este cambio, ignora este mensaje.</p>
      </div>
    `,
  });
  console.log('📧 Código enviado:', info.messageId);
  return info;
};
