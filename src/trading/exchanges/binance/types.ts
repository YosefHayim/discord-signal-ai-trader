export interface BinanceConfig {
  apiKey: string;
  apiSecret: string;
  testnet: boolean;
}

export interface BinanceOrderResult {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: string;
  quantity: number;
  price?: number;
  status: string;
  executedQty?: number;
  avgPrice?: number;
}

export interface BinancePosition {
  symbol: string;
  positionAmt: number;
  entryPrice: number;
  markPrice: number;
  unrealizedProfit: number;
  liquidationPrice: number;
  leverage: number;
  marginType: string;
}

export interface BinanceBalance {
  asset: string;
  balance: number;
  availableBalance: number;
}
