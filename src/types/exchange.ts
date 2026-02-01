export enum Exchange {
  BINANCE = 'binance',
  IBKR = 'ibkr',
}

export enum Market {
  SPOT = 'spot',
  FUTURES = 'futures',
  STOCK = 'stock',
}

export interface ExchangeConfig {
  exchange: Exchange;
  testnet: boolean;
  apiKey?: string;
  apiSecret?: string;
}
