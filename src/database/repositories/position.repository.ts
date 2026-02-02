import { eq, desc, and, count } from 'drizzle-orm';
import { getDb } from '../connection.js';
import { positions, type PositionSelect } from '../schema.js';
import type { Position, PositionSide, PositionStatus, PositionUpdate } from '../../types/index.js';

function toPosition(row: PositionSelect): Position {
  return {
    id: row.id,
    tradeId: row.tradeId,
    exchange: row.exchange as Position['exchange'],
    market: row.market as Position['market'],
    symbol: row.symbol,
    side: row.side as PositionSide,
    quantity: row.quantity,
    entryPrice: row.entryPrice,
    currentPrice: row.currentPrice ?? undefined,
    stopLoss: row.stopLoss ?? undefined,
    takeProfit: row.takeProfit ?? undefined,
    leverage: row.leverage,
    unrealizedPnl: row.unrealizedPnl ?? undefined,
    unrealizedPnlPercentage: row.unrealizedPnlPercentage ?? undefined,
    status: row.status as PositionStatus,
    openedAt: row.openedAt,
    closedAt: row.closedAt ?? undefined,
    updatedAt: row.updatedAt,
  };
}

export const positionRepository = {
  async create(position: Omit<Position, 'id' | 'updatedAt'>): Promise<Position> {
    const db = getDb();
    const [row] = await db.insert(positions).values({
      tradeId: position.tradeId,
      exchange: position.exchange,
      market: position.market,
      symbol: position.symbol,
      side: position.side,
      quantity: position.quantity,
      entryPrice: position.entryPrice,
      currentPrice: position.currentPrice,
      stopLoss: position.stopLoss,
      takeProfit: position.takeProfit,
      leverage: position.leverage,
      unrealizedPnl: position.unrealizedPnl,
      unrealizedPnlPercentage: position.unrealizedPnlPercentage,
      status: position.status,
      openedAt: position.openedAt,
      closedAt: position.closedAt,
    }).returning();
    return toPosition(row);
  },

  async findById(id: string): Promise<Position | null> {
    const db = getDb();
    const [row] = await db.select().from(positions).where(eq(positions.id, id)).limit(1);
    return row ? toPosition(row) : null;
  },

  async findByTradeId(tradeId: string): Promise<Position | null> {
    const db = getDb();
    const [row] = await db.select().from(positions).where(eq(positions.tradeId, tradeId)).limit(1);
    return row ? toPosition(row) : null;
  },

  async findOpenPosition(symbol: string, side: PositionSide): Promise<Position | null> {
    const db = getDb();
    const [row] = await db.select()
      .from(positions)
      .where(and(
        eq(positions.symbol, symbol),
        eq(positions.side, side),
        eq(positions.status, 'open')
      ))
      .limit(1);
    return row ? toPosition(row) : null;
  },

  async hasOpenPosition(symbol: string, side: PositionSide): Promise<boolean> {
    const db = getDb();
    const [result] = await db.select({ count: count() })
      .from(positions)
      .where(and(
        eq(positions.symbol, symbol),
        eq(positions.side, side),
        eq(positions.status, 'open')
      ));
    return (result?.count ?? 0) > 0;
  },

  async update(id: string, updates: PositionUpdate): Promise<Position | null> {
    const db = getDb();
    const [row] = await db.update(positions)
      .set({ 
        ...updates, 
        updatedAt: new Date() 
      })
      .where(eq(positions.id, id))
      .returning();
    return row ? toPosition(row) : null;
  },

  async closePosition(id: string): Promise<Position | null> {
    const db = getDb();
    const [row] = await db.update(positions)
      .set({ 
        status: 'closed', 
        closedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(positions.id, id))
      .returning();
    return row ? toPosition(row) : null;
  },

  async findAllOpen(): Promise<Position[]> {
    const db = getDb();
    const rows = await db.select()
      .from(positions)
      .where(eq(positions.status, 'open'));
    return rows.map(toPosition);
  },

  async findMany(
    filter: { status?: PositionStatus; symbol?: string } = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<Position[]> {
    const db = getDb();
    const conditions = [];
    if (filter.status) {
      conditions.push(eq(positions.status, filter.status));
    }
    if (filter.symbol) {
      conditions.push(eq(positions.symbol, filter.symbol));
    }
    
    const rows = await db.select()
      .from(positions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(positions.openedAt))
      .offset(offset)
      .limit(limit);
    
    return rows.map(toPosition);
  },

  async count(filter: { status?: PositionStatus } = {}): Promise<number> {
    const db = getDb();
    const conditions = [];
    if (filter.status) {
      conditions.push(eq(positions.status, filter.status));
    }
    
    const [result] = await db.select({ count: count() })
      .from(positions)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    return result?.count ?? 0;
  },
};
