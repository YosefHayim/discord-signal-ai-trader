import type { Context } from 'grammy';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('telegram-stop');

let stopCallback: (() => Promise<void>) | null = null;
let resumeCallback: (() => Promise<void>) | null = null;
let isPaused = false;

export function setStopCallback(callback: () => Promise<void>): void {
  stopCallback = callback;
}

export function setResumeCallback(callback: () => Promise<void>): void {
  resumeCallback = callback;
}

export function getIsPaused(): boolean {
  return isPaused;
}

export async function handleStop(ctx: Context): Promise<void> {
  logger.info('Stop command received', { userId: ctx.from?.id });
  
  if (isPaused) {
    await ctx.reply('⚠️ Signal processing is already paused');
    return;
  }

  if (!stopCallback) {
    await ctx.reply('❌ Stop functionality not available');
    return;
  }

  try {
    await stopCallback();
    isPaused = true;
    await ctx.reply('⏸️ Signal processing has been *paused*\n\nUse /resume to continue', { 
      parse_mode: 'Markdown' 
    });
    logger.warn('Signal processing paused via Telegram command');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error stopping', { error: message });
    await ctx.reply('❌ Error pausing signal processing');
  }
}

export async function handleResume(ctx: Context): Promise<void> {
  logger.info('Resume command received', { userId: ctx.from?.id });
  
  if (!isPaused) {
    await ctx.reply('✅ Signal processing is already running');
    return;
  }

  if (!resumeCallback) {
    await ctx.reply('❌ Resume functionality not available');
    return;
  }

  try {
    await resumeCallback();
    isPaused = false;
    await ctx.reply('▶️ Signal processing has been *resumed*', { 
      parse_mode: 'Markdown' 
    });
    logger.info('Signal processing resumed via Telegram command');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error resuming', { error: message });
    await ctx.reply('❌ Error resuming signal processing');
  }
}
