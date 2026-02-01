import { createLogger } from '../utils/logger.js';
import { positionRepository } from '../database/index.js';
import { PositionSide, PositionStatus, type Position, type PositionUpdate } from '../types/index.js';

const logger = createLogger('position-manager');

// In-memory cache for fast lookups
const openPositions: Map<string, Position> = new Map();

// Create unique key for position lookup
function getPositionKey(symbol: string, side: PositionSide): string {
  return `${symbol.toUpperCase()}_${side}`;
}

/**
 * Sync positions from database on startup
 */
export async function syncFromDatabase(): Promise<void> {
  logger.info('Syncing positions from database');
  
  const positions = await positionRepository.findAllOpen();
  openPositions.clear();
  
  for (const pos of positions) {
    const key = getPositionKey(pos.symbol, pos.side);
    openPositions.set(key, pos);
  }
  
  logger.info('Positions synced', { count: openPositions.size });
}

/**
 * Check if we can open a new position (no pyramiding)
 */
export function canOpenPosition(symbol: string, side: PositionSide): boolean {
  const key = getPositionKey(symbol, side);
  const hasPosition = openPositions.has(key);
  
  if (hasPosition) {
    logger.debug('Position already exists', { symbol, side });
  }
  
  return !hasPosition;
}

/**
 * Register a new open position
 */
export async function openPosition(position: Omit<Position, 'id' | 'updatedAt'>): Promise<Position> {
  const key = getPositionKey(position.symbol, position.side);
  
  // Double check we're not pyramiding
  if (openPositions.has(key)) {
    throw new Error(`Position already exists for ${position.symbol} ${position.side}`);
  }
  
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
}

/**
 * Update an existing position
 */
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

/**
 * Close a position
 */
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

/**
 * Get a specific position
 */
export function getPosition(symbol: string, side: PositionSide): Position | null {
  const key = getPositionKey(symbol, side);
  return openPositions.get(key) || null;
}

/**
 * Get all open positions
 */
export function getAllOpenPositions(): Position[] {
  return Array.from(openPositions.values());
}

/**
 * Check if position exists
 */
export function hasOpenPosition(symbol: string, side: PositionSide): boolean {
  const key = getPositionKey(symbol, side);
  return openPositions.has(key);
}

/**
 * Get count of open positions
 */
export function getOpenPositionCount(): number {
  return openPositions.size;
}

/**
 * Clear all cached positions (for testing)
 */
export function clearPositionCache(): void {
  openPositions.clear();
  logger.debug('Position cache cleared');
}
