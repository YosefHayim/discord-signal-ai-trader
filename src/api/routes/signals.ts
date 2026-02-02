import { Router } from 'express';
import { signalRepository } from '../../database/index.js';
import type { SignalStatus } from '../../types/index.js';
import { SignalStatus as SignalStatusEnum } from '../../types/index.js';

const router = Router();

interface SignalFilter {
  status?: SignalStatus;
}

router.get('/', async (req, res) => {
  const { 
    status, 
    limit = '50', 
    offset = '0',
    sort = 'desc'
  } = req.query;

  const filter: SignalFilter = {};
  
  if (status && Object.values(SignalStatusEnum).includes(status as SignalStatus)) {
    filter.status = status as SignalStatus;
  }

  const signals = await signalRepository.findMany(
    filter,
    parseInt(limit as string, 10),
    parseInt(offset as string, 10),
    sort === 'asc' ? 'asc' : 'desc'
  );

  const total = await signalRepository.count(filter);

  res.json({
    data: signals,
    pagination: {
      total,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    },
  });
});

router.get('/stats', async (_req, res) => {
  const stats = await signalRepository.getStatusCounts();
  res.json(stats);
});

router.get('/:id', async (req, res) => {
  const signal = await signalRepository.findById(req.params.id);
  
  if (!signal) {
    res.status(404).json({ error: 'Signal not found' });
    return;
  }

  res.json(signal);
});

export default router;
