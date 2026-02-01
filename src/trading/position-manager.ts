import { createLogger } from '../utils/logger.js';
import { positionRepository } from '../database/index.js';
import { PositionSide, PositionStatus, type Position, type PositionUpdate } from '../types/index.js';

const logger = createLogger('position-manager');

const openPositions: Map<string, Position> = new Map();
const pendingPositions: Set<string> = new Set();

function getPositionKey(symbol: string, side: PositionSide): string {
  return `${symbol.toUpperCase()}_${side}`;
}

export async function syncFromDatabase(): Promise<void> {
  logger.info('Syncing positions from database');

  const positions = await positionRepository.findAllOpen();
  openPositions.clear();
  pendingPositions.clear();

  for (const pos of positions) {
    const key = getPositionKey(pos.symbol, pos.side);
    openPositions.set(key, pos);
  }

  logger.info('Positions synced', { count: openPositions.size });
}

export function canOpenPosition(symbol: string, side: PositionSide): boolean {
  const key = getPositionKey(symbol, side);
  return !openPositions.has(key) && !pendingPositions.has(key);
}

export async function tryOpenPosition(
  position: Omit<Position, 'id' | 'updatedAt'>
): Promise<Position | null> {
  const key = getPositionKey(position.symbol, position.side);

  if (openPositions.has(key)) {
    logger.debug('Position already exists', { symbol: position.symbol, side: position.side });
    return null;
  }

  if (pendingPositions.has(key)) {
    logger.debug('Position open already in progress', { symbol: position.symbol, side: position.side });
    return null;
  }

  pendingPositions.add(key);

  try {
    const saved = await positionRepository.create(position);
    openPositions.set(key, saved);

    logger.info('Position opened', {
      id: saved.id,
      symbol: saved.symbol,
      side: saved.side,
      quantity: saved.quantity,
      entryPrice: saved.entryPrice,
    });

    return saved;
  } catch (error) {
    logger.error('Failed to open position', {
      symbol: position.symbol,
      side: position.side,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    throw error;
  } finally {
    pendingPositions.delete(key);
  }
}

export async function openPosition(position: Omit<Position, 'id' | 'updatedAt'>): Promise<Position> {
  const result = await tryOpenPosition(position);
  if (!result) {
    throw new Error(`Position already exists for ${position.symbol} ${position.side}`);
  }
  return result;
}

export async function updatePosition(
  symbol: string,
  side: PositionSide,
  updates: PositionUpdate
): Promise<Position | null> {
  const key = getPositionKey(symbol, side);
  const existing = openPositions.get(key);

  if (!existing) {
    logger.warn('Position not found for update', { symbol, side });
    return null;
  }

  const updated = await positionRepository.update(existing.id, updates);

  if (updated) {
    if (updates.status === PositionStatus.CLOSED) {
      openPositions.delete(key);
      logger.info('Position closed', { symbol, side });
    } else {
      openPositions.set(key, updated);
      logger.debug('Position updated', { symbol, side, updates });
    }
  }

  return updated;
}

export async function closePosition(symbol: string, side: PositionSide): Promise<Position | null> {
  const key = getPositionKey(symbol, side);
  const existing = openPositions.get(key);

  if (!existing) {
    logger.warn('Position not found for closing', { symbol, side });
    return null;
  }

  const closed = await positionRepository.closePosition(existing.id);

  if (closed) {
    openPositions.delete(key);
    logger.info('Position closed', {
      id: closed.id,
      symbol: closed.symbol,
      side: closed.side,
    });
  }

  return closed;
}

export function getPosition(symbol: string, side: PositionSide): Position | null {
  const key = getPositionKey(symbol, side);
  return openPositions.get(key) || null;
}

export function getAllOpenPositions(): Position[] {
  return Array.from(openPositions.values());
}

export function hasOpenPosition(symbol: string, side: PositionSide): boolean {
  const key = getPositionKey(symbol, side);
  return openPositions.has(key);
}

export function getOpenPositionCount(): number {
  return openPositions.size;
}

export function clearPositionCache(): void {
  openPositions.clear();
  pendingPositions.clear();
  logger.debug('Position cache cleared');
}
