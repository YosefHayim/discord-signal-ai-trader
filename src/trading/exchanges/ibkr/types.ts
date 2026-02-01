export interface IBKRConfig {
  host: string;
  port: number;
  clientId: number;
}

export interface IBKROrderResult {
  orderId: number;
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  orderType: string;
  status: string;
  avgFillPrice?: number;
}

export interface IBKRPosition {
  symbol: string;
  position: number;
  avgCost: number;
  marketPrice?: number;
  marketValue?: number;
  unrealizedPnL?: number;
  realizedPnL?: number;
}

export interface IBKRContract {
  symbol: string;
  secType: string;
  exchange: string;
  currency: string;
  conId?: number;
}
