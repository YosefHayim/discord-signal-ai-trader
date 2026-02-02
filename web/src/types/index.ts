export const Exchange = {
  BINANCE: 'binance',
  IBKR: 'ibkr',
} as const;
export type Exchange = (typeof Exchange)[keyof typeof Exchange];

export const Market = {
  SPOT: 'spot',
  FUTURES: 'futures',
  STOCK: 'stock',
} as const;
export type Market = (typeof Market)[keyof typeof Market];

export const SignalSource = {
  DISCORD_TEXT: 'discord_text',
  DISCORD_IMAGE: 'discord_image',
  WEBHOOK: 'webhook',
} as const;
export type SignalSource = (typeof SignalSource)[keyof typeof SignalSource];

export const SignalStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  PARSED: 'parsed',
  EXECUTED: 'executed',
  SKIPPED: 'skipped',
  FAILED: 'failed',
} as const;
export type SignalStatus = (typeof SignalStatus)[keyof typeof SignalStatus];

export const TradeStatus = {
  PENDING: 'pending',
  OPEN: 'open',
  PARTIALLY_FILLED: 'partially_filled',
  FILLED: 'filled',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
  CLOSED: 'closed',
} as const;
export type TradeStatus = (typeof TradeStatus)[keyof typeof TradeStatus];

export const PositionSide = {
  LONG: 'LONG',
  SHORT: 'SHORT',
} as const;
export type PositionSide = (typeof PositionSide)[keyof typeof PositionSide];

export const PositionStatus = {
  OPEN: 'open',
  CLOSED: 'closed',
} as const;
export type PositionStatus = (typeof PositionStatus)[keyof typeof PositionStatus];

export interface ParsedSignal {
  symbol: string;
  action: 'LONG' | 'SHORT';
  entry: number;
  stopLoss?: number;
  takeProfit?: number | number[];
  leverage?: number;
  confidence: number;
  exchange?: Exchange;
  market?: Market;
}

export interface Signal {
  _id: string;
  id: string;
  source: SignalSource;
  rawContent: string;
  channelId: string;
  userId: string;
  messageId: string;
  hash: string;
  receivedAt: string;
  parsed?: ParsedSignal;
  status: SignalStatus;
  statusReason?: string;
  processedAt?: string;
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
  openedAt: string;
  closedAt?: string;
  updatedAt: string;
}

export interface Trade {
  _id: string;
  id: string;
  signalId: string;
  exchange: Exchange;
  market: Market;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage: number;
  status: TradeStatus;
  pnl?: number;
  pnlPercentage?: number;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  closeReason?: string;
}

export interface StatusResponse {
  status: string;
  timestamp: string;
  connections: {
    discord: boolean;
    database: boolean;
    binance: boolean;
    ibkr: boolean;
  };
  trading: {
    simulationMode: boolean;
    isPaused: boolean;
    confidenceThreshold: number;
    defaultPositionSize: number;
    defaultLeverage: number;
  };
  queue: QueueStats;
  positions: {
    open: number;
  };
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface SignalStats {
  pending: number;
  processing: number;
  parsed: number;
  executed: number;
  skipped: number;
  failed: number;
}

export interface TradeStats {
  total: number;
  open: number;
  closed: number;
  totalPnl: number;
  winRate: number;
}

export interface ControlStatus {
  isPaused: boolean;
}

export interface PositionsUpdateEvent {
  positions: Position[];
  count: number;
}

export interface QueueUpdateEvent extends QueueStats {}
