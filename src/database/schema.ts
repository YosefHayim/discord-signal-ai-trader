import {
  pgTable,
  text,
  timestamp,
  real,
  integer,
  jsonb,
  uniqueIndex,
  index,
  uuid,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const signals = pgTable('signals', {
  id: uuid('id').defaultRandom().primaryKey(),
  source: text('source').notNull(),
  rawContent: text('raw_content').notNull(),
  imageBase64: text('image_base64'),
  imageMimeType: text('image_mime_type'),
  channelId: text('channel_id').notNull(),
  userId: text('user_id').notNull(),
  messageId: text('message_id').notNull(),
  hash: text('hash').notNull().unique(),
  receivedAt: timestamp('received_at').notNull().defaultNow(),
  parsed: jsonb('parsed').$type<ParsedSignalJson>(),
  status: text('status').notNull().default('pending'),
  statusReason: text('status_reason'),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('signals_hash_idx').on(table.hash),
  index('signals_status_received_idx').on(table.status, table.receivedAt),
]);

export const trades = pgTable('trades', {
  id: uuid('id').defaultRandom().primaryKey(),
  signalId: text('signal_id').notNull(),
  exchange: text('exchange').notNull(),
  market: text('market').notNull(),
  symbol: text('symbol').notNull(),
  side: text('side').notNull(),
  quantity: real('quantity').notNull(),
  entryPrice: real('entry_price').notNull(),
  stopLoss: real('stop_loss'),
  takeProfit: real('take_profit'),
  leverage: integer('leverage').notNull().default(1),
  status: text('status').notNull().default('pending'),
  orders: jsonb('orders').$type<OrderInfoJson[]>().default([]),
  pnl: real('pnl'),
  pnlPercentage: real('pnl_percentage'),
  closedAt: timestamp('closed_at'),
  closeReason: text('close_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('trades_signal_id_idx').on(table.signalId),
  index('trades_symbol_idx').on(table.symbol),
  index('trades_status_symbol_idx').on(table.status, table.symbol),
]);

export const positions = pgTable('positions', {
  id: uuid('id').defaultRandom().primaryKey(),
  tradeId: text('trade_id').notNull(),
  exchange: text('exchange').notNull(),
  market: text('market').notNull(),
  symbol: text('symbol').notNull(),
  side: text('side').notNull(),
  quantity: real('quantity').notNull(),
  entryPrice: real('entry_price').notNull(),
  currentPrice: real('current_price'),
  stopLoss: real('stop_loss'),
  takeProfit: real('take_profit'),
  leverage: integer('leverage').notNull().default(1),
  unrealizedPnl: real('unrealized_pnl'),
  unrealizedPnlPercentage: real('unrealized_pnl_percentage'),
  status: text('status').notNull().default('open'),
  openedAt: timestamp('opened_at').notNull().defaultNow(),
  closedAt: timestamp('closed_at'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('positions_trade_id_idx').on(table.tradeId),
  index('positions_symbol_idx').on(table.symbol),
  index('positions_status_idx').on(table.status),
]);

export const signalsRelations = relations(signals, ({ many }) => ({
  trades: many(trades),
}));

export const tradesRelations = relations(trades, ({ one, many }) => ({
  signal: one(signals, {
    fields: [trades.signalId],
    references: [signals.id],
  }),
  positions: many(positions),
}));

export const positionsRelations = relations(positions, ({ one }) => ({
  trade: one(trades, {
    fields: [positions.tradeId],
    references: [trades.id],
  }),
}));

export interface ParsedSignalJson {
  symbol: string;
  action: 'LONG' | 'SHORT';
  entry: number;
  stopLoss?: number;
  takeProfit?: number | number[];
  leverage?: number;
  confidence: number;
  exchange?: string;
  market?: string;
}

export interface OrderInfoJson {
  orderId: string;
  type: string;
  side: string;
  price?: number;
  quantity: number;
  status: string;
  filledQuantity?: number;
  avgPrice?: number;
  createdAt: string;
  updatedAt?: string;
}

export type SignalInsert = typeof signals.$inferInsert;
export type SignalSelect = typeof signals.$inferSelect;
export type TradeInsert = typeof trades.$inferInsert;
export type TradeSelect = typeof trades.$inferSelect;
export type PositionInsert = typeof positions.$inferInsert;
export type PositionSelect = typeof positions.$inferSelect;
