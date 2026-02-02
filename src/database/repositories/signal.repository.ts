import { eq, desc, sql, and, count } from 'drizzle-orm';
import { getDb } from '../connection.js';
import { signals, type SignalSelect, type ParsedSignalJson } from '../schema.js';
import type { Signal, SignalStatus, RawSignal, ParsedSignal } from '../../types/index.js';

function toSignal(row: SignalSelect): Signal {
  return {
    id: row.id,
    source: row.source as Signal['source'],
    rawContent: row.rawContent,
    imageBase64: row.imageBase64 ?? undefined,
    imageMimeType: row.imageMimeType ?? undefined,
    channelId: row.channelId,
    userId: row.userId,
    messageId: row.messageId,
    hash: row.hash,
    receivedAt: row.receivedAt,
    parsed: row.parsed ? toParsedSignal(row.parsed) : undefined,
    status: row.status as SignalStatus,
    statusReason: row.statusReason ?? undefined,
    processedAt: row.processedAt ?? undefined,
  };
}

function toParsedSignal(json: ParsedSignalJson): ParsedSignal {
  return {
    symbol: json.symbol,
    action: json.action,
    entry: json.entry,
    stopLoss: json.stopLoss,
    takeProfit: json.takeProfit,
    leverage: json.leverage,
    confidence: json.confidence,
    exchange: json.exchange as ParsedSignal['exchange'],
    market: json.market as ParsedSignal['market'],
  };
}

function toJsonParsed(parsed: ParsedSignal): ParsedSignalJson {
  return {
    symbol: parsed.symbol,
    action: parsed.action,
    entry: parsed.entry,
    stopLoss: parsed.stopLoss,
    takeProfit: parsed.takeProfit,
    leverage: parsed.leverage,
    confidence: parsed.confidence,
    exchange: parsed.exchange,
    market: parsed.market,
  };
}

export const signalRepository = {
  async create(rawSignal: RawSignal): Promise<Signal> {
    const db = getDb();
    const [row] = await db.insert(signals).values({
      source: rawSignal.source,
      rawContent: rawSignal.rawContent,
      imageBase64: rawSignal.imageBase64,
      imageMimeType: rawSignal.imageMimeType,
      channelId: rawSignal.channelId,
      userId: rawSignal.userId,
      messageId: rawSignal.messageId,
      hash: rawSignal.hash,
      receivedAt: rawSignal.receivedAt,
    }).returning();
    return toSignal(row);
  },

  async findByHash(hash: string): Promise<Signal | null> {
    const db = getDb();
    const [row] = await db.select().from(signals).where(eq(signals.hash, hash)).limit(1);
    return row ? toSignal(row) : null;
  },

  async findById(id: string): Promise<Signal | null> {
    const db = getDb();
    const [row] = await db.select().from(signals).where(eq(signals.id, id)).limit(1);
    return row ? toSignal(row) : null;
  },

  async updateStatus(
    id: string, 
    status: SignalStatus, 
    reason?: string
  ): Promise<Signal | null> {
    const db = getDb();
    const [row] = await db.update(signals)
      .set({ 
        status, 
        statusReason: reason,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(signals.id, id))
      .returning();
    return row ? toSignal(row) : null;
  },

  async updateParsed(
    id: string, 
    parsed: ParsedSignal, 
    status: SignalStatus
  ): Promise<Signal | null> {
    const db = getDb();
    const [row] = await db.update(signals)
      .set({ 
        parsed: toJsonParsed(parsed), 
        status, 
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(signals.id, id))
      .returning();
    return row ? toSignal(row) : null;
  },

  async exists(hash: string): Promise<boolean> {
    const db = getDb();
    const [result] = await db.select({ count: count() }).from(signals).where(eq(signals.hash, hash));
    return (result?.count ?? 0) > 0;
  },

  async findRecent(limit: number = 50): Promise<Signal[]> {
    const db = getDb();
    const rows = await db.select()
      .from(signals)
      .orderBy(desc(signals.receivedAt))
      .limit(limit);
    return rows.map(toSignal);
  },

  async findMany(
    filter: { status?: SignalStatus } = {},
    limit: number = 50,
    offset: number = 0,
    sortDirection: 'asc' | 'desc' = 'desc'
  ): Promise<Signal[]> {
    const db = getDb();
    const conditions = [];
    if (filter.status) {
      conditions.push(eq(signals.status, filter.status));
    }
    
    const query = db.select()
      .from(signals)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sortDirection === 'desc' ? desc(signals.receivedAt) : signals.receivedAt)
      .offset(offset)
      .limit(limit);
    
    const rows = await query;
    return rows.map(toSignal);
  },

  async count(filter: { status?: SignalStatus } = {}): Promise<number> {
    const db = getDb();
    const conditions = [];
    if (filter.status) {
      conditions.push(eq(signals.status, filter.status));
    }
    
    const [result] = await db.select({ count: count() })
      .from(signals)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    return result?.count ?? 0;
  },

  async getStatusCounts(): Promise<Record<string, number>> {
    const db = getDb();
    const rows = await db.select({
      status: signals.status,
      count: count(),
    })
    .from(signals)
    .groupBy(signals.status);
    
    return rows.reduce((acc, { status, count }) => {
      acc[status] = count;
      return acc;
    }, {} as Record<string, number>);
  },
};
