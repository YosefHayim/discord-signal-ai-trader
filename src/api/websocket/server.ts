import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { createLogger } from '../../utils/logger.js';
import * as positionManager from '../../trading/position-manager.js';
import { getQueueStats } from '../../signals/queue/signal-queue.js';
import { isProcessingPaused } from '../../signals/processor.js';

const logger = createLogger('websocket');

let io: SocketIOServer | null = null;
let updateInterval: ReturnType<typeof setInterval> | null = null;

export function initializeWebSocket(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    logger.info('WebSocket client connected', { id: socket.id });

    socket.emit('status', {
      isPaused: isProcessingPaused(),
      openPositions: positionManager.getOpenPositionCount(),
    });

    socket.on('disconnect', () => {
      logger.debug('WebSocket client disconnected', { id: socket.id });
    });

    socket.on('subscribe', (room: string) => {
      socket.join(room);
      logger.debug('Client subscribed to room', { id: socket.id, room });
    });

    socket.on('unsubscribe', (room: string) => {
      socket.leave(room);
      logger.debug('Client unsubscribed from room', { id: socket.id, room });
    });
  });

  startPeriodicUpdates();
  
  logger.info('WebSocket server initialized');
  return io;
}

function startPeriodicUpdates(): void {
  if (updateInterval) {
    clearInterval(updateInterval);
  }

  updateInterval = setInterval(async () => {
    if (!io) return;

    const positions = positionManager.getAllOpenPositions();
    const queueStats = await getQueueStats();

    io.emit('positions:update', {
      positions,
      count: positions.length,
    });

    io.emit('queue:update', queueStats);
  }, 5000);
}

export function emitSignalReceived(signal: unknown): void {
  if (io) {
    io.emit('signal:received', signal);
  }
}

export function emitTradeExecuted(trade: unknown): void {
  if (io) {
    io.emit('trade:executed', trade);
  }
}

export function emitPositionOpened(position: unknown): void {
  if (io) {
    io.emit('position:opened', position);
  }
}

export function emitPositionClosed(position: unknown): void {
  if (io) {
    io.emit('position:closed', position);
  }
}

export function emitProcessingStatusChanged(isPaused: boolean): void {
  if (io) {
    io.emit('processing:status', { isPaused });
  }
}

export function getWebSocketServer(): SocketIOServer | null {
  return io;
}

export function closeWebSocket(): void {
  if (io) {
    io.close();
    io = null;
    logger.info('WebSocket server closed');
  }

  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}
