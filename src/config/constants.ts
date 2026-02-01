export const CONFIDENCE_WEIGHTS = {
  BASE: 0.3,
  HAS_ENTRY: 0.2,
  HAS_STOP_LOSS: 0.2,
  HAS_TAKE_PROFIT: 0.15,
  SYMBOL_RECOGNIZED: 0.15,
} as const;

export const RATE_LIMITS = {
  SIGNAL_QUEUE_MAX: 10,
  SIGNAL_QUEUE_DURATION_MS: 10000,
} as const;

export const TIMEOUTS = {
  SHUTDOWN_MS: 30000,
  IBKR_CONNECTION_MS: 10000,
  IBKR_ORDER_MS: 30000,
  BINANCE_REQUEST_MS: 30000,
} as const;

export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY_MS: 1000,
  BACKOFF_MULTIPLIER: 2,
} as const;

export const CRYPTO_SYMBOLS = [
  'BTC', 'ETH', 'BNB', 'XRP', 'ADA', 'DOGE', 'SOL', 'DOT', 'AVAX', 'MATIC',
  'LINK', 'UNI', 'ATOM', 'LTC', 'ETC', 'FIL', 'NEAR', 'APT', 'ARB', 'OP',
  'INJ', 'SUI', 'SEI', 'TIA', 'JUP', 'WIF', 'PEPE', 'SHIB', 'BONK', 'FLOKI',
  'AAVE', 'MKR', 'CRV', 'LDO', 'SNX', 'COMP', 'SAND', 'MANA', 'AXS', 'GALA',
] as const;

export const STOCK_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK',
  'UNH', 'JNJ', 'V', 'WMT', 'JPM', 'PG', 'MA', 'HD', 'CVX', 'MRK', 'ABBV',
  'PEP', 'KO', 'COST', 'AVGO', 'TMO', 'MCD', 'CSCO', 'ABT', 'DHR', 'ACN',
  'LLY', 'VZ', 'ADBE', 'NKE', 'NFLX', 'CRM', 'INTC', 'AMD', 'QCOM', 'TXN',
  'SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO',
] as const;

export const CRYPTO_QUOTE_SUFFIXES = ['USDT', 'BUSD', 'BTC', 'ETH', 'BNB', 'USDC'] as const;

export type CryptoSymbol = (typeof CRYPTO_SYMBOLS)[number];
export type StockSymbol = (typeof STOCK_SYMBOLS)[number];
export type CryptoQuoteSuffix = (typeof CRYPTO_QUOTE_SUFFIXES)[number];
