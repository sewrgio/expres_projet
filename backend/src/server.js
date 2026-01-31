import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // O el puerto de tu frontend
  credentials: true
}));
app.use(express.json());

// Rutas de ejemplo
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend funcionando' });
});

app.get('/api/users', (req, res) => {
  res.json([
    { id: 1, name: 'Juan' },
    { id: 2, name: 'María' },
    { id :3 , name: 'xdddddd'}
  ]);
});

app.post('/api/data', (req, res) => {
  console.log(req.body);
  res.json({ received: req.body });
});

app.listen(PORT, () => {
  console.log(`✅ Backend en http://localhost:${PORT}`);
});