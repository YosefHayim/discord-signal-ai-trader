import type { Bot } from 'grammy';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('telegram-error');

let bot: Bot | null = null;
let chatId: string | null = null;

export function initializeErrorNotifications(botInstance: Bot, targetChatId: string): void {
  bot = botInstance;
  chatId = targetChatId;
}

async function sendErrorMessage(message: string): Promise<void> {
  if (!bot || !chatId) {
    logger.warn('Error notifications not initialized');
    return;
  }

  try {
    await bot.api.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to send Telegram error message', { error: msg });
  }
}

export async function notifyError(error: Error, context?: string): Promise<void> {
  const message = 
    `🚨 *Error Alert*\n\n` +
    `*Type:* ${error.name}\n` +
    `*Message:* ${error.message}\n` +
    `${context ? `*Context:* ${context}\n` : ''}` +
    `*Time:* ${new Date().toLocaleString()}`;
  
  await sendErrorMessage(message);
}

export async function notifyConnectionError(service: string, error: Error): Promise<void> {
  const message = 
    `🔌 *Connection Error*\n\n` +
    `*Service:* ${service}\n` +
    `*Error:* ${error.message}\n` +
    `*Time:* ${new Date().toLocaleString()}`;
  
  await sendErrorMessage(message);
}

export async function notifyTradeError(symbol: string, action: string, error: Error): Promise<void> {
  const message = 
    `❌ *Trade Error*\n\n` +
    `*Symbol:* ${symbol}\n` +
    `*Action:* ${action}\n` +
    `*Error:* ${error.message}\n` +
    `*Time:* ${new Date().toLocaleString()}`;
  
  await sendErrorMessage(message);
}
