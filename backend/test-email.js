import { sendVerificationEmail } from './src/services/emailService.js';
import 'dotenv/config';

const test = async () => {
  try {
    console.log('Probando envío de correo a iujotep@gmail.com...');
    await sendVerificationEmail('iujotep@gmail.com', 'Sergio', 'test-token-123');
    console.log('✅ Correo enviado con éxito. Revisa tu bandeja de entrada y SPAM.');
  } catch (error) {
    console.error('❌ Error enviando correo:', error);
  }
};

test();
