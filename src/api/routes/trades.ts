import { Router } from 'express';
import { tradeRepository } from '../../database/index.js';
import type { TradeStatus } from '../../types/index.js';
import { TradeStatus as TradeStatusEnum } from '../../types/index.js';

const router = Router();

interface TradeFilter {
  status?: TradeStatus;
  symbol?: string;
}

router.get('/', async (req, res) => {
  const { 
    status, 
    exchange,
    limit = '50', 
    offset = '0',
    sort = 'desc'
  } = req.query;

  const filter: TradeFilter = {};
  
  if (status && Object.values(TradeStatusEnum).includes(status as TradeStatus)) {
    filter.status = status as TradeStatus;
  }
  
  if (exchange && typeof exchange === 'string') {
    filter.symbol = exchange;
  }

  const trades = await tradeRepository.findMany(
    filter,
    parseInt(limit as string, 10),
    parseInt(offset as string, 10),
    sort === 'asc' ? 'asc' : 'desc'
  );

  const total = await tradeRepository.count(filter);

  res.json({
    data: trades,
    pagination: {
      total,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    },
  });
});

router.get('/stats', async (_req, res) => {
  const stats = await tradeRepository.getStats();
  res.json(stats);
});

router.get('/:id', async (req, res) => {
  const trade = await tradeRepository.findById(req.params.id);
  
  if (!trade) {
    res.status(404).json({ error: 'Trade not found' });
    return;
  }

  res.json(trade);
});

export default router;
