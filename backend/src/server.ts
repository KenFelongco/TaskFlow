import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { checkDatabaseConnection } from './config/db';
import apiRouter from './routes';
import { errorHandler } from './middleware/error';
import { initSocketIO } from './socket/socketHandler';
import { startReminderScheduler } from './services/reminderService';

const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json());

// Request logger
app.use((req, _res, next) => {
  if (config.nodeEnv === 'development') {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// Healthcheck endpoint (accessible directly or via /api/health)
const healthHandler = (_req: express.Request, res: express.Response) => {
  res.json({
    status: 'online',
    service: 'TaskFlow Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// APK Download endpoint for physical Android devices
app.get('/download/apk', (_req, res) => {
  const apkPath = path.resolve(__dirname, '../../TaskFlow.apk');
  if (fs.existsSync(apkPath)) {
    res.download(apkPath, 'TaskFlow.apk');
  } else {
    res.status(404).send('TaskFlow.apk not found. Please build it first.');
  }
});

// Root API router
app.use('/api', apiRouter);

// Global Error Handler
app.use(errorHandler);

// Initialize WebSockets
initSocketIO(server);

// Start Server
server.listen(config.port, async () => {
  console.log(`\n🚀 TaskFlow Backend running at http://localhost:${config.port}`);
  console.log(`📡 WebSocket server listening on port ${config.port}`);
  
  // Healthcheck database
  await checkDatabaseConnection();

  // Start background cron jobs
  startReminderScheduler();
});

export { app, server };
