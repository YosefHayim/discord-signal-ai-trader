import mongoose from 'mongoose';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('database');

let isConnected = false;

export async function connectDatabase(uri: string): Promise<void> {
  if (isConnected) {
    logger.debug('Already connected to MongoDB');
    return;
  }

  try {
    logger.info('Connecting to MongoDB...');
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    logger.info('Connected to MongoDB successfully');

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('MongoDB disconnected');
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to connect to MongoDB', { error: message });
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) return;
  
  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('Disconnected from MongoDB');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error disconnecting from MongoDB', { error: message });
    throw error;
  }
}

export function isDatabaseConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}
