import type { Bot } from 'grammy';
import { createLogger } from '../../utils/logger.js';
import { getErrorMessage } from '../../utils/errors.js';

const logger = createLogger('telegram-shared');

let bot: Bot | null = null;
let chatId: string | null = null;

export function initializeSharedNotifications(botInstance: Bot, targetChatId: string): void {
  bot = botInstance;
  chatId = targetChatId;
  logger.debug('Shared notifications initialized');
}

export async function sendTelegramMessage(
  message: string,
  parseMode: 'Markdown' | 'HTML' = 'Markdown'
): Promise<boolean> {
  if (!bot || !chatId) {
    logger.warn('Notifications not initialized');
    return false;
  }

  try {
    await bot.api.sendMessage(chatId, message, { parse_mode: parseMode });
    return true;
  } catch (error) {
    logger.error('Failed to send Telegram message', { error: getErrorMessage(error) });
    return false;
  }
}

export function getBot(): Bot | null {
  return bot;
}

export function getChatId(): string | null {
  return chatId;
}

export class MessageBuilder {
  private lines: string[] = [];

  addHeader(emoji: string, title: string): this {
    this.lines.push(`${emoji} *${title}*\n`);
    return this;
  }

  addField(label: string, value: string | number | undefined | null): this {
    if (value !== undefined && value !== null) {
      this.lines.push(`*${label}:* ${value}`);
    }
    return this;
  }

  addPrice(label: string, price: number | undefined): this {
    if (price !== undefined) {
      this.lines.push(`*${label}:* $${price}`);
    } else {
      this.lines.push(`*${label}:* N/A`);
    }
    return this;
  }

  addOptionalPrice(label: string, price: number | undefined): this {
    if (price !== undefined) {
      this.lines.push(`*${label}:* $${price}`);
    }
    return this;
  }

  addPercentage(label: string, pct: number | undefined): this {
    if (pct !== undefined) {
      this.lines.push(`*${label}:* ${pct.toFixed(2)}%`);
    }
    return this;
  }

  addNote(note: string): this {
    this.lines.push(`\n_${note}_`);
    return this;
  }

  addBlankLine(): this {
    this.lines.push('');
    return this;
  }

  addSection(title: string): this {
    this.lines.push(`\n*${title}:*`);
    return this;
  }

  addBullet(text: string): this {
    this.lines.push(`• ${text}`);
    return this;
  }

  build(): string {
    return this.lines.join('\n');
  }
}
