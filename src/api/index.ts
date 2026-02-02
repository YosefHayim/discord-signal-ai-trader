import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { createLogger } from '../utils/logger.js';
import { apiKeyAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { initializeWebSocket, closeWebSocket } from './websocket/server.js';
import statusRoutes from './routes/status.js';
import signalsRoutes from './routes/signals.js';
import tradesRoutes from './routes/trades.js';
import positionsRoutes from './routes/positions.js';
import controlRoutes from './routes/control.js';

const logger = createLogger('api');

const app = express();
const httpServer = createServer(app);

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', apiKeyAuth);

app.use('/api/status', statusRoutes);
app.use('/api/signals', signalsRoutes);
app.use('/api/trades', tradesRoutes);
app.use('/api/positions', positionsRoutes);
app.use('/api/control', controlRoutes);

app.use(errorHandler);

let isRunning = false;

export function startApiServer(port: number): void {
  if (isRunning) {
    logger.warn('API server already running');
    return;
  }

  initializeWebSocket(httpServer);

  httpServer.listen(port, () => {
    isRunning = true;
    logger.info('API server started', { port });
  });
}

export async function stopApiServer(): Promise<void> {
  if (!isRunning) return;

  closeWebSocket();

  return new Promise((resolve) => {
    httpServer.close(() => {
      isRunning = false;
      logger.info('API server stopped');
      resolve();
    });
  });
}

export { app, httpServer };
