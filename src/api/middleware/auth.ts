import type { Request, Response, NextFunction } from 'express';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('api-auth');

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    next();
    return;
  }

  const providedKey = req.headers['x-api-key'] || req.query.apiKey;

  if (!providedKey) {
    logger.warn('Missing API key', { path: req.path, ip: req.ip });
    res.status(401).json({ error: 'API key required' });
    return;
  }

  if (providedKey !== apiKey) {
    logger.warn('Invalid API key', { path: req.path, ip: req.ip });
    res.status(403).json({ error: 'Invalid API key' });
    return;
  }

  next();
}
