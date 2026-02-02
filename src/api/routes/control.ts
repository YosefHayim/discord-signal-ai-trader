import { Router } from 'express';
import { pauseProcessing, resumeProcessing, isProcessingPaused } from '../../signals/processor.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('api-control');
const router = Router();

router.post('/pause', async (_req, res) => {
  if (isProcessingPaused()) {
    res.json({ success: true, message: 'Already paused', isPaused: true });
    return;
  }

  pauseProcessing();
  logger.info('Processing paused via API');
  
  res.json({ success: true, message: 'Processing paused', isPaused: true });
});

router.post('/resume', async (_req, res) => {
  if (!isProcessingPaused()) {
    res.json({ success: true, message: 'Already running', isPaused: false });
    return;
  }

  resumeProcessing();
  logger.info('Processing resumed via API');
  
  res.json({ success: true, message: 'Processing resumed', isPaused: false });
});

router.get('/status', async (_req, res) => {
  res.json({ isPaused: isProcessingPaused() });
});

export default router;
