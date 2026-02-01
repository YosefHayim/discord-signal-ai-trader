import type { Bot } from 'grammy';
import { createLogger } from '../../utils/logger.js';
import type { ParsedSignal, Trade } from '../../types/index.js';

const logger = createLogger('telegram-notify');

let bot: Bot | null = null;
let chatId: string | null = null;

export function initializeNotifications(botInstance: Bot, targetChatId: string): void {
  bot = botInstance;
  chatId = targetChatId;
  logger.info('Telegram notifications initialized', { chatId });
}

async function sendMessage(message: string): Promise<void> {
  if (!bot || !chatId) {
    logger.warn('Notifications not initialized');
    return;
  }

  try {
    await bot.api.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to send Telegram message', { error: msg });
  }
}

export async function notifySignalReceived(signal: ParsedSignal, source: string): Promise<void> {
  const confidence = (signal.confidence * 100).toFixed(0);
  const message = 
    `📨 *New Signal Received*\n\n` +
    `*Symbol:* ${signal.symbol}\n` +
    `*Action:* ${signal.action}\n` +
    `*Entry:* $${signal.entry}\n` +
    `*Stop Loss:* ${signal.stopLoss ? '$' + signal.stopLoss : 'N/A'}\n` +
    `*Take Profit:* ${signal.takeProfit ? '$' + signal.takeProfit : 'N/A'}\n` +
    `*Confidence:* ${confidence}%\n` +
    `*Source:* ${source}`;
  
  await sendMessage(message);
}

export async function notifyTradeExecuted(trade: Trade): Promise<void> {
  const emoji = trade.side === 'BUY' ? '🟢' : '🔴';
  const message = 
    `${emoji} *Trade Executed*\n\n` +
    `*Symbol:* ${trade.symbol}\n` +
    `*Side:* ${trade.side}\n` +
    `*Exchange:* ${trade.exchange.toUpperCase()}\n` +
    `*Entry:* $${trade.entryPrice}\n` +
    `*Quantity:* ${trade.quantity}\n` +
    `*Leverage:* ${trade.leverage}x\n` +
    `*Stop Loss:* ${trade.stopLoss ? '$' + trade.stopLoss : 'N/A'}\n` +
    `*Take Profit:* ${trade.takeProfit ? '$' + trade.takeProfit : 'N/A'}`;
  
  await sendMessage(message);
}

export async function notifyTradeClosed(trade: Trade): Promise<void> {
  const pnlEmoji = (trade.pnl ?? 0) >= 0 ? '✅' : '❌';
  const message = 
    `${pnlEmoji} *Trade Closed*\n\n` +
    `*Symbol:* ${trade.symbol}\n` +
    `*Side:* ${trade.side}\n` +
    `*PnL:* $${trade.pnl?.toFixed(2) ?? 'N/A'} (${trade.pnlPercentage?.toFixed(2) ?? 'N/A'}%)\n` +
    `*Reason:* ${trade.closeReason ?? 'Manual'}`;
  
  await sendMessage(message);
}

export async function notifyLowConfidence(signal: ParsedSignal, threshold: number): Promise<void> {
  const confidence = (signal.confidence * 100).toFixed(0);
  const thresholdPct = (threshold * 100).toFixed(0);
  const message = 
    `⚠️ *Low Confidence Signal*\n\n` +
    `*Symbol:* ${signal.symbol}\n` +
    `*Action:* ${signal.action}\n` +
    `*Entry:* $${signal.entry}\n` +
    `*Confidence:* ${confidence}% (threshold: ${thresholdPct}%)\n\n` +
    `_Signal was logged but NOT executed_`;
  
  await sendMessage(message);
}

export async function notifySimulatedTrade(signal: ParsedSignal): Promise<void> {
  const message = 
    `🎮 *Simulated Trade*\n\n` +
    `*Symbol:* ${signal.symbol}\n` +
    `*Action:* ${signal.action}\n` +
    `*Entry:* $${signal.entry}\n` +
    `*Stop Loss:* ${signal.stopLoss ? '$' + signal.stopLoss : 'N/A'}\n` +
    `*Take Profit:* ${signal.takeProfit ? '$' + signal.takeProfit : 'N/A'}\n\n` +
    `_SIMULATION MODE - No real trade executed_`;
  
  await sendMessage(message);
}
