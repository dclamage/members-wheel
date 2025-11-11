import express from 'express';
import cors from 'cors';
import wheelsRouter from './routes/wheels.js';
import adminRouter from './routes/admin.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/wheels', wheelsRouter);
app.use('/api/admin', adminRouter);

app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ message: 'Internal Server Error' });
});

export default app;
