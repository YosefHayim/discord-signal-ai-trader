import { Bot } from 'grammy';
import { createLogger } from '../utils/logger.js';
import { handleStart } from './commands/start.js';
import { handleStatus, setStatusCallback, type BotStatus } from './commands/status.js';
import { handlePositions, setPositionsCallback } from './commands/positions.js';
import { handleStop, handleResume, setStopCallback, setResumeCallback, getIsPaused } from './commands/stop.js';
import { initializeNotifications } from './notifications/trade.notification.js';
import { initializeErrorNotifications } from './notifications/error.notification.js';
import type { Position } from '../types/index.js';

const logger = createLogger('telegram-bot');

let telegramBot: Bot | null = null;

export interface TelegramBotOptions {
  token: string;
  chatId: string;
  onStatus?: () => Promise<BotStatus>;
  onPositions?: () => Promise<Position[]>;
  onStop?: () => Promise<void>;
  onResume?: () => Promise<void>;
}

export function createTelegramBot(options: TelegramBotOptions): Bot {
  if (telegramBot) {
    logger.warn('Telegram bot already exists');
    return telegramBot;
  }

  logger.info('Creating Telegram bot');

  telegramBot = new Bot(options.token);

  // Set callbacks
  if (options.onStatus) setStatusCallback(options.onStatus);
  if (options.onPositions) setPositionsCallback(options.onPositions);
  if (options.onStop) setStopCallback(options.onStop);
  if (options.onResume) setResumeCallback(options.onResume);

  // Initialize notifications
  initializeNotifications(telegramBot, options.chatId);
  initializeErrorNotifications(telegramBot, options.chatId);

  // Register commands
  telegramBot.command('start', handleStart);
  telegramBot.command('help', handleStart);
  telegramBot.command('status', handleStatus);
  telegramBot.command('positions', handlePositions);
  telegramBot.command('stop', handleStop);
  telegramBot.command('resume', handleResume);

  // Error handling
  telegramBot.catch((err) => {
    logger.error('Telegram bot error', { error: err.message });
  });

  return telegramBot;
}

export function getTelegramBot(): Bot | null {
  return telegramBot;
}

export async function startTelegramBot(): Promise<void> {
  if (!telegramBot) {
    throw new Error('Telegram bot not created. Call createTelegramBot first.');
  }

  logger.info('Starting Telegram bot...');
  telegramBot.start({
    onStart: (botInfo) => {
      logger.info('Telegram bot started', { username: botInfo.username });
    },
  });
}

export async function stopTelegramBot(): Promise<void> {
  if (telegramBot) {
    logger.info('Stopping Telegram bot');
    await telegramBot.stop();
    telegramBot = null;
  }
}

export { getIsPaused } from './commands/stop.js';
