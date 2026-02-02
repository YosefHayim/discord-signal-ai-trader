import { Router } from 'express';
import { isDiscordConnected } from '../../discord/client.js';
import { isDatabaseConnected } from '../../database/connection.js';
import { isBinanceInitialized } from '../../trading/exchanges/binance/client.js';
import { isIBKRConnected } from '../../trading/exchanges/ibkr/client.js';
import { isProcessingPaused } from '../../signals/processor.js';
import { getQueueStats } from '../../signals/queue/signal-queue.js';
import * as positionManager from '../../trading/position-manager.js';
import { getConfig } from '../../config/index.js';

const router = Router();

router.get('/', async (_req, res) => {
  const config = getConfig();
  const queueStats = await getQueueStats();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    connections: {
      discord: isDiscordConnected(),
      database: isDatabaseConnected(),
      binance: isBinanceInitialized(),
      ibkr: isIBKRConnected(),
    },
    trading: {
      simulationMode: config.trading.simulationMode,
      isPaused: isProcessingPaused(),
      confidenceThreshold: config.trading.confidenceThreshold,
      defaultPositionSize: config.trading.defaultPositionSize,
      defaultLeverage: config.trading.defaultLeverage,
    },
    queue: queueStats,
    positions: {
      open: positionManager.getOpenPositionCount(),
    },
  });
});

export default router;
