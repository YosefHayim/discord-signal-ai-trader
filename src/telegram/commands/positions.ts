import type { Context } from 'grammy';
import { createLogger } from '../../utils/logger.js';
import type { Position } from '../../types/index.js';

const logger = createLogger('telegram-positions');

let positionsCallback: (() => Promise<Position[]>) | null = null;

export function setPositionsCallback(callback: () => Promise<Position[]>): void {
  positionsCallback = callback;
}

export async function handlePositions(ctx: Context): Promise<void> {
  logger.info('Positions command received', { userId: ctx.from?.id });
  
  if (!positionsCallback) {
    await ctx.reply('❌ Position information not available');
    return;
  }

  try {
    const positions = await positionsCallback();
    
    if (positions.length === 0) {
      await ctx.reply('📭 No open positions');
      return;
    }

    let message = `📈 *Open Positions (${positions.length})*\n\n`;
    
    for (const pos of positions) {
      const pnlEmoji = (pos.unrealizedPnl ?? 0) >= 0 ? '🟢' : '🔴';
      const pnlStr = pos.unrealizedPnl !== undefined 
        ? `${pnlEmoji} $${pos.unrealizedPnl.toFixed(2)} (${pos.unrealizedPnlPercentage?.toFixed(2)}%)`
        : 'N/A';
      
      message += `*${pos.symbol}* ${pos.side}\n`;
      message += `• Entry: $${pos.entryPrice}\n`;
      message += `• Current: $${pos.currentPrice ?? 'N/A'}\n`;
      message += `• Size: ${pos.quantity}\n`;
      message += `• PnL: ${pnlStr}\n`;
      if (pos.stopLoss) message += `• SL: $${pos.stopLoss}\n`;
      if (pos.takeProfit) message += `• TP: $${pos.takeProfit}\n`;
      message += '\n';
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error getting positions', { error: message });
    await ctx.reply('❌ Error retrieving positions');
  }
}
