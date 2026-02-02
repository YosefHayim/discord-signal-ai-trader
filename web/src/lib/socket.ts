import { io, Socket } from 'socket.io-client';
import type { PositionsUpdateEvent, QueueStats } from '@/types';

type EventCallback<T> = (data: T) => void;

class SocketManager {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<EventCallback<unknown>>> = new Map();

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('positions:update', (data: PositionsUpdateEvent) => {
      this.emit('positions:update', data);
    });

    this.socket.on('queue:update', (data: QueueStats) => {
      this.emit('queue:update', data);
    });

    this.socket.on('signal:received', (data: unknown) => {
      this.emit('signal:received', data);
    });

    this.socket.on('trade:executed', (data: unknown) => {
      this.emit('trade:executed', data);
    });

    this.socket.on('position:opened', (data: unknown) => {
      this.emit('position:opened', data);
    });

    this.socket.on('position:closed', (data: unknown) => {
      this.emit('position:closed', data);
    });

    this.socket.on('processing:status', (data: { isPaused: boolean }) => {
      this.emit('processing:status', data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private emit<T>(event: string, data: T): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }

  on<T>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback<unknown>);

    return () => {
      this.listeners.get(event)?.delete(callback as EventCallback<unknown>);
    };
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketManager = new SocketManager();
