import type { Context } from 'grammy';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('telegram-status');

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

export interface BotStatus {
  isConnected: boolean;
  isPaused: boolean;
  queueStats: QueueStats;
  openPositions: number;
  simulationMode: boolean;
}

let statusCallback: (() => Promise<BotStatus>) | null = null;

export function setStatusCallback(callback: () => Promise<BotStatus>): void {
  statusCallback = callback;
}

export async function handleStatus(ctx: Context): Promise<void> {
  logger.info('Status command received', { userId: ctx.from?.id });
  
  if (!statusCallback) {
    await ctx.reply('❌ Status information not available');
    return;
  }

  try {
    const status = await statusCallback();
    
    const modeEmoji = status.simulationMode ? '🎮' : '💰';
    const modeText = status.simulationMode ? 'SIMULATION' : 'LIVE';
    const connectionStatus = status.isConnected ? '🟢 Connected' : '🔴 Disconnected';
    const processingStatus = status.isPaused ? '⏸️ Paused' : '▶️ Running';

    await ctx.reply(
      `📊 *Bot Status*\n\n` +
      `*Mode:* ${modeEmoji} ${modeText}\n` +
      `*Discord:* ${connectionStatus}\n` +
      `*Processing:* ${processingStatus}\n\n` +
      `*Queue Stats:*\n` +
      `• Waiting: ${status.queueStats.waiting}\n` +
      `• Active: ${status.queueStats.active}\n` +
      `• Completed: ${status.queueStats.completed}\n` +
      `• Failed: ${status.queueStats.failed}\n\n` +
      `*Open Positions:* ${status.openPositions}`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error getting status', { error: message });
    await ctx.reply('❌ Error retrieving status');
  }
}


