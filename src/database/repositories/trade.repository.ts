import { eq, desc, and, inArray, count, sum, sql } from 'drizzle-orm';
import { getDb } from '../connection.js';
import { trades, type TradeSelect, type OrderInfoJson } from '../schema.js';
import type { Trade, TradeStatus, OrderInfo } from '../../types/index.js';

function toTrade(row: TradeSelect): Trade {
  return {
    id: row.id,
    signalId: row.signalId,
    exchange: row.exchange as Trade['exchange'],
    market: row.market as Trade['market'],
    symbol: row.symbol,
    side: row.side as Trade['side'],
    quantity: row.quantity,
    entryPrice: row.entryPrice,
    stopLoss: row.stopLoss ?? undefined,
    takeProfit: row.takeProfit ?? undefined,
    leverage: row.leverage,
    status: row.status as TradeStatus,
    orders: (row.orders ?? []).map(toOrderInfo),
    pnl: row.pnl ?? undefined,
    pnlPercentage: row.pnlPercentage ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    closedAt: row.closedAt ?? undefined,
    closeReason: row.closeReason ?? undefined,
  };
}

function toOrderInfo(json: OrderInfoJson): OrderInfo {
  return {
    orderId: json.orderId,
    type: json.type as OrderInfo['type'],
    side: json.side as OrderInfo['side'],
    price: json.price,
    quantity: json.quantity,
    status: json.status,
    filledQuantity: json.filledQuantity,
    avgPrice: json.avgPrice,
    createdAt: new Date(json.createdAt),
    updatedAt: json.updatedAt ? new Date(json.updatedAt) : undefined,
  };
}

function toOrderInfoJson(order: OrderInfo): OrderInfoJson {
  return {
    orderId: order.orderId,
    type: order.type,
    side: order.side,
    price: order.price,
    quantity: order.quantity,
    status: order.status,
    filledQuantity: order.filledQuantity,
    avgPrice: order.avgPrice,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt?.toISOString(),
  };
}

export const tradeRepository = {
  async create(trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>): Promise<Trade> {
    const db = getDb();
    const [row] = await db.insert(trades).values({
      signalId: trade.signalId,
      exchange: trade.exchange,
      market: trade.market,
      symbol: trade.symbol,
      side: trade.side,
      quantity: trade.quantity,
      entryPrice: trade.entryPrice,
      stopLoss: trade.stopLoss,
      takeProfit: trade.takeProfit,
      leverage: trade.leverage,
      status: trade.status,
      orders: trade.orders.map(toOrderInfoJson),
      pnl: trade.pnl,
      pnlPercentage: trade.pnlPercentage,
      closedAt: trade.closedAt,
      closeReason: trade.closeReason,
    }).returning();
    return toTrade(row);
  },

  async findById(id: string): Promise<Trade | null> {
    const db = getDb();
    const [row] = await db.select().from(trades).where(eq(trades.id, id)).limit(1);
    return row ? toTrade(row) : null;
  },

  async findBySignalId(signalId: string): Promise<Trade | null> {
    const db = getDb();
    const [row] = await db.select().from(trades).where(eq(trades.signalId, signalId)).limit(1);
    return row ? toTrade(row) : null;
  },

  async updateStatus(id: string, status: TradeStatus): Promise<Trade | null> {
    const db = getDb();
    const [row] = await db.update(trades)
      .set({ status, updatedAt: new Date() })
      .where(eq(trades.id, id))
      .returning();
    return row ? toTrade(row) : null;
  },

  async addOrder(id: string, order: OrderInfo): Promise<Trade | null> {
    const db = getDb();
    const existing = await this.findById(id);
    if (!existing) return null;
    
    const updatedOrders = [...existing.orders.map(toOrderInfoJson), toOrderInfoJson(order)];
    const [row] = await db.update(trades)
      .set({ orders: updatedOrders, updatedAt: new Date() })
      .where(eq(trades.id, id))
      .returning();
    return row ? toTrade(row) : null;
  },

  async closeTrade(
    id: string, 
    pnl: number, 
    pnlPercentage: number, 
    reason: string
  ): Promise<Trade | null> {
    const db = getDb();
    const [row] = await db.update(trades)
      .set({ 
        status: 'closed',
        pnl,
        pnlPercentage,
        closedAt: new Date(),
        closeReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(trades.id, id))
      .returning();
    return row ? toTrade(row) : null;
  },

  async findOpenTrades(): Promise<Trade[]> {
    const db = getDb();
    const rows = await db.select()
      .from(trades)
      .where(inArray(trades.status, ['pending', 'open', 'partially_filled']));
    return rows.map(toTrade);
  },

  async findMany(
    filter: { status?: TradeStatus; symbol?: string } = {},
    limit: number = 50,
    offset: number = 0,
    sortDirection: 'asc' | 'desc' = 'desc'
  ): Promise<Trade[]> {
    const db = getDb();
    const conditions = [];
    if (filter.status) {
      conditions.push(eq(trades.status, filter.status));
    }
    if (filter.symbol) {
      conditions.push(eq(trades.symbol, filter.symbol));
    }
    
    const rows = await db.select()
      .from(trades)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sortDirection === 'desc' ? desc(trades.createdAt) : trades.createdAt)
      .offset(offset)
      .limit(limit);
    
    return rows.map(toTrade);
  },

  async count(filter: { status?: TradeStatus } = {}): Promise<number> {
    const db = getDb();
    const conditions = [];
    if (filter.status) {
      conditions.push(eq(trades.status, filter.status));
    }
    
    const [result] = await db.select({ count: count() })
      .from(trades)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    return result?.count ?? 0;
  },

  async getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    totalPnl: number;
    winRate: number;
  }> {
    const db = getDb();
    
    const statusRows = await db.select({
      status: trades.status,
      count: count(),
    })
    .from(trades)
    .groupBy(trades.status);

    const byStatus = statusRows.reduce((acc, { status, count }) => {
      acc[status] = count;
      return acc;
    }, {} as Record<string, number>);

    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);

    const [pnlResult] = await db.select({
      totalPnl: sum(trades.pnl),
      wins: sql<number>`COUNT(CASE WHEN ${trades.pnl} > 0 THEN 1 END)`,
      closedCount: count(),
    })
    .from(trades)
    .where(eq(trades.status, 'closed'));

    const totalPnl = Number(pnlResult?.totalPnl) || 0;
    const wins = Number(pnlResult?.wins) || 0;
    const closedCount = pnlResult?.closedCount || 0;
    const winRate = closedCount > 0 ? (wins / closedCount) * 100 : 0;

    return { total, byStatus, totalPnl, winRate };
  },
};
