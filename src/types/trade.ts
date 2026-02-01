import type { Exchange, Market } from './exchange.js';

export enum TradeStatus {
  PENDING = 'pending',
  OPEN = 'open',
  PARTIALLY_FILLED = 'partially_filled',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
  CLOSED = 'closed',
}

export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
  STOP_LOSS = 'STOP_LOSS',
  TAKE_PROFIT = 'TAKE_PROFIT',
}

export interface OrderInfo {
  orderId: string;
  type: OrderType;
  side: OrderSide;
  price?: number;
  quantity: number;
  status: string;
  filledQuantity?: number;
  avgPrice?: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Trade {
  id: string;
  signalId: string;
  exchange: Exchange;
  market: Market;
  symbol: string;
  side: OrderSide;
  quantity: number;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage: number;
  status: TradeStatus;
  orders: OrderInfo[];
  pnl?: number;
  pnlPercentage?: number;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  closeReason?: string;
}

export interface TradeExecution {
  signalId: string;
  symbol: string;
  action: 'LONG' | 'SHORT';
  entry: number;
  stopLoss?: number;
  takeProfit?: number;
  quantity: number;
  leverage: number;
  exchange: Exchange;
  market: Market;
}
