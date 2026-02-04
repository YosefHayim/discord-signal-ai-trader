import { Router } from 'express';
import * as positionManager from '../../trading/position-manager.js';
import { positionRepository } from '../../database/index.js';
import * as binance from '../../trading/exchanges/binance/client.js';
import * as ibkr from '../../trading/exchanges/ibkr/client.js';
import { Exchange, PositionSide, PositionStatus } from '../../types/index.js';
import { getErrorMessage } from '../../utils/errors.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('api-positions');
const router = Router();

router.get('/', async (_req, res) => {
  const openPositions = positionManager.getAllOpenPositions();
  res.json({
    data: openPositions,
    count: openPositions.length,
  });
});

router.get('/history', async (req, res) => {
  const { limit = '50', offset = '0', status, orderBy } = req.query;

  const filter: { status?: PositionStatus } = {};
  if (status === PositionStatus.OPEN || status === PositionStatus.CLOSED) {
    filter.status = status;
  }

  const order =
    orderBy === 'closedAt' || orderBy === 'openedAt'
      ? orderBy
      : filter.status === PositionStatus.CLOSED
        ? 'closedAt'
        : 'openedAt';

  const positions = await positionRepository.findMany(
    filter,
    parseInt(limit as string, 10),
    parseInt(offset as string, 10),
    order
  );

  const total = await positionRepository.count(filter);

  res.json({
    data: positions,
    pagination: {
      total,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    },
  });
});

router.post('/:symbol/close', async (req, res) => {
  const { symbol } = req.params;
  const { side } = req.body as { side?: string };

  if (!side || !['LONG', 'SHORT'].includes(side)) {
    res.status(400).json({ error: 'Invalid side. Must be LONG or SHORT' });
    return;
  }

  const positionSide = side as PositionSide;
  const position = positionManager.getPosition(symbol, positionSide);

  if (!position) {
    res.status(404).json({ error: `No open position for ${symbol} ${side}` });
    return;
  }

  try {
    let result = null;

    if (position.exchange === Exchange.BINANCE) {
      result = await binance.closePosition(symbol);
    } else if (position.exchange === Exchange.IBKR) {
      result = await ibkr.closePosition(symbol);
    }

    await positionManager.closePosition(symbol, positionSide);

    logger.info('Position closed via API', { symbol, side });

    res.json({
      success: true,
      message: `Position ${symbol} ${side} closed`,
      result,
    });
  } catch (error) {
    logger.error('Failed to close position via API', {
      symbol,
      side,
      error: getErrorMessage(error),
    });
    res.status(500).json({
      error: 'Failed to close position',
      message: getErrorMessage(error),
    });
  }
});

export default router;
