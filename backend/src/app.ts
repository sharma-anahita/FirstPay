import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import apiRouter from './routes/api';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRouter);

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'FirstPay Backend API is operational',
    timestamp: new Date()
  });
});

// Centralized Error Handler (must be after routes)
app.use(errorHandler);

// Start server
const startServer = async () => {
  // Connect to Database
  await connectDB();

  app.listen(PORT, () => {
    console.log(`[Server] FirstPay Backend running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
};

// Only start the server if not imported for testing
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
