import { getConfig } from './config/index.js';
import { createLogger } from './utils/logger.js';
import { getErrorMessage, getErrorStack } from './utils/errors.js';
import { setupShutdownHooks, registerShutdownHandler } from './utils/shutdown.js';
import { connectDatabase, disconnectDatabase, isDatabaseConnected } from './database/connection.js';
import { createRedisConnection, getRedisConnection, closeRedisConnection } from './signals/queue/connection.js';
import { createSignalQueue, closeSignalQueue, getQueueStats } from './signals/queue/signal-queue.js';
import { 
  startSignalProcessor, 
  stopSignalProcessor, 
  setExecuteCallback,
  setConfidenceThreshold,
  pauseProcessing,
  resumeProcessing,
  isProcessingPaused,
} from './signals/processor.js';
import { createDiscordClient, connectDiscord, disconnectDiscord, isDiscordConnected } from './discord/client.js';
import { createTelegramBot, startTelegramBot, stopTelegramBot } from './telegram/bot.js';
import { initializeBinance, closeBinance, isBinanceInitialized } from './trading/exchanges/binance/client.js';
import { initializeIBKR, connectIBKR, disconnectIBKR, isIBKRConnected } from './trading/exchanges/ibkr/client.js';
import { configureExecutor, executeSignal } from './trading/executor.js';
import * as positionManager from './trading/position-manager.js';
import { addSignalToQueue } from './signals/queue/signal-queue.js';
import { startApiServer, stopApiServer } from './api/index.js';
import type { RawSignal, Signal, ParsedSignal, Position } from './types/index.js';
import type { BotStatus } from './telegram/commands/status.js';

const logger = createLogger('main');

async function initializeDatabase(): Promise<void> {
  const config = getConfig();
  await connectDatabase(config.database.url);
  registerShutdownHandler('database', disconnectDatabase);
}

async function initializeRedis(): Promise<void> {
  const config = getConfig();
  const redis = createRedisConnection(config.redis.url);
  createSignalQueue(redis);
  registerShutdownHandler('redis', async () => {
    await closeSignalQueue();
    await closeRedisConnection();
  });
}

async function initializeSignalProcessor(): Promise<void> {
  const config = getConfig();
  const redis = getRedisConnection();
  
  if (!redis) {
    throw new Error('Redis not initialized. Call initializeRedis first.');
  }
  
  setConfidenceThreshold(config.trading.confidenceThreshold);
  setExecuteCallback(async (signal: Signal, parsed: ParsedSignal) => {
    await executeSignal(signal, parsed);
  });
  
  startSignalProcessor(redis);
  registerShutdownHandler('signal-processor', stopSignalProcessor);
}

async function initializeDiscord(): Promise<void> {
  const config = getConfig();
  
  createDiscordClient({
    token: config.discord.token,
    channelIds: config.discord.channelIds,
    userIds: config.discord.userIds,
    onSignal: async (rawSignal: RawSignal) => {
      await addSignalToQueue(rawSignal);
    },
  });
  
  await connectDiscord(config.discord.token);
  registerShutdownHandler('discord', disconnectDiscord);
}

async function initializeTelegram(): Promise<void> {
  const config = getConfig();
  
  createTelegramBot({
    token: config.telegram.botToken,
    chatId: config.telegram.chatId,
    onStatus: async (): Promise<BotStatus> => ({
      isConnected: isDiscordConnected(),
      isPaused: isProcessingPaused(),
      queueStats: await getQueueStats(),
      openPositions: positionManager.getOpenPositionCount(),
      simulationMode: config.trading.simulationMode,
    }),
    onPositions: async (): Promise<Position[]> => {
      return positionManager.getAllOpenPositions();
    },
    onStop: async (): Promise<void> => {
      pauseProcessing();
    },
    onResume: async (): Promise<void> => {
      resumeProcessing();
    },
  });
  
  await startTelegramBot();
  registerShutdownHandler('telegram', stopTelegramBot);
}

async function initializeBinanceExchange(): Promise<void> {
  const config = getConfig();
  
  initializeBinance({
    apiKey: config.binance.apiKey,
    apiSecret: config.binance.apiSecret,
    testnet: config.binance.testnet,
  });
  
  registerShutdownHandler('binance', async () => {
    closeBinance();
  });
}

async function initializeIBKRExchange(): Promise<void> {
  const config = getConfig();
  
  initializeIBKR({
    host: config.ibkr.host,
    port: config.ibkr.port,
    clientId: config.ibkr.clientId,
  });
  
  try {
    await connectIBKR();
  } catch (error) {
    logger.warn('IBKR connection failed, stock trading disabled', {
      error: getErrorMessage(error),
    });
  }
  
  registerShutdownHandler('ibkr', disconnectIBKR);
}

async function initializeTradeExecutor(): Promise<void> {
  const config = getConfig();
  
  configureExecutor({
    simulationMode: config.trading.simulationMode,
    defaultPositionSize: config.trading.defaultPositionSize,
    defaultLeverage: config.trading.defaultLeverage,
    confidenceThreshold: config.trading.confidenceThreshold,
  });
}

async function initializePositionManager(): Promise<void> {
  await positionManager.syncFromDatabase();
}

async function main(): Promise<void> {
  logger.info('Starting Discord Signal AI Trader...');
  
  const config = getConfig();
  
  logger.info('Configuration loaded', {
    simulationMode: config.trading.simulationMode,
    confidenceThreshold: config.trading.confidenceThreshold,
    channelCount: config.discord.channelIds.length,
    userCount: config.discord.userIds.length,
    binanceTestnet: config.binance.testnet,
  });

  setupShutdownHooks();

  await initializeDatabase();
  logger.info('Database connected');

  await initializeRedis();
  logger.info('Redis connected');

  await initializePositionManager();
  logger.info('Position manager initialized');

  await initializeTradeExecutor();
  logger.info('Trade executor configured');

  await initializeBinanceExchange();
  logger.info('Binance initialized');

  await initializeIBKRExchange();
  logger.info('IBKR initialization complete');

  await initializeSignalProcessor();
  logger.info('Signal processor started');

  await initializeTelegram();
  logger.info('Telegram bot started');

  await initializeDiscord();
  logger.info('Discord bot connected');

  startApiServer(config.server.port);
  registerShutdownHandler('api-server', stopApiServer);
  logger.info('API server started', { port: config.server.port });

  logger.info('Discord Signal AI Trader is running', {
    mode: config.trading.simulationMode ? 'SIMULATION' : 'LIVE',
    discordConnected: isDiscordConnected(),
    databaseConnected: isDatabaseConnected(),
    binanceReady: isBinanceInitialized(),
    ibkrConnected: isIBKRConnected(),
  });

  if (config.trading.simulationMode) {
    logger.warn('SIMULATION MODE is enabled - no real trades will be executed');
  }
}

main().catch((error) => {
  logger.error('Fatal error during startup', { 
    error: getErrorMessage(error),
    stack: getErrorStack(error),
  });
  process.exit(1);
});
