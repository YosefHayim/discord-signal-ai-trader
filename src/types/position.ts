import type { Exchange, Market } from './exchange.js';
import type { OrderSide } from './trade.js';

export enum PositionSide {
  LONG = 'LONG',
  SHORT = 'SHORT',
}

export enum PositionStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

export interface Position {
  id: string;
  tradeId: string;
  exchange: Exchange;
  market: Market;
  symbol: string;
  side: PositionSide;
  quantity: number;
  entryPrice: number;
  currentPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage: number;
  unrealizedPnl?: number;
  unrealizedPnlPercentage?: number;
  status: PositionStatus;
  openedAt: Date;
  closedAt?: Date;
  updatedAt: Date;
}

export interface PositionUpdate {
  currentPrice?: number;
  unrealizedPnl?: number;
  unrealizedPnlPercentage?: number;
  status?: PositionStatus;
  closedAt?: Date;
}
