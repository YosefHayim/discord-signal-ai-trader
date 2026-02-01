import type { Context } from 'grammy';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('telegram-start');

export async function handleStart(ctx: Context): Promise<void> {
  logger.info('Start command received', { userId: ctx.from?.id });
  
  await ctx.reply(
    `🤖 *Discord Signal AI Trader*\n\n` +
    `Welcome! I'm your trading signal notification bot.\n\n` +
    `*Available Commands:*\n` +
    `/status - Check bot and system status\n` +
    `/positions - View open positions\n` +
    `/stop - Pause signal processing\n` +
    `/start - Resume signal processing\n` +
    `/help - Show this message\n\n` +
    `I'll notify you about:\n` +
    `• New signals received\n` +
    `• Trade executions\n` +
    `• Position updates\n` +
    `• Errors and alerts`,
    { parse_mode: 'Markdown' }
  );
}
