import { createLogger } from '../utils/logger.js';
import { Exchange, Market, type ParsedSignal } from '../types/index.js';

const logger = createLogger('trade-router');

// Common crypto pairs (usually end with USDT, BTC, ETH, etc.)
const CRYPTO_SUFFIXES = ['USDT', 'BUSD', 'BTC', 'ETH', 'BNB', 'USDC'];

// Well-known crypto symbols
const KNOWN_CRYPTO = new Set([
  'BTC', 'ETH', 'BNB', 'XRP', 'ADA', 'DOGE', 'SOL', 'DOT', 'AVAX', 'MATIC',
  'LINK', 'UNI', 'ATOM', 'LTC', 'ETC', 'FIL', 'NEAR', 'APT', 'ARB', 'OP',
  'INJ', 'SUI', 'SEI', 'TIA', 'JUP', 'WIF', 'PEPE', 'SHIB', 'BONK', 'FLOKI',
]);

// Well-known stock tickers
const KNOWN_STOCKS = new Set([
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK',
  'UNH', 'JNJ', 'V', 'WMT', 'JPM', 'PG', 'MA', 'HD', 'CVX', 'MRK', 'ABBV',
  'PEP', 'KO', 'COST', 'AVGO', 'TMO', 'MCD', 'CSCO', 'ABT', 'DHR', 'ACN',
  'LLY', 'VZ', 'ADBE', 'NKE', 'NFLX', 'CRM', 'INTC', 'AMD', 'QCOM', 'TXN',
  'SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO', // ETFs
]);

export interface RouteDecision {
  exchange: Exchange;
  market: Market;
  symbol: string; // Normalized symbol for the exchange
  confidence: number;
}

/**
 * Determine if a symbol is crypto based on patterns and known lists
 */
function isCryptoSymbol(symbol: string): boolean {
  const upperSymbol = symbol.toUpperCase();
  
  // Check for crypto pair suffixes (e.g., BTCUSDT, ETHBTC)
  for (const suffix of CRYPTO_SUFFIXES) {
    if (upperSymbol.endsWith(suffix)) {
      return true;
    }
  }
  
  // Check known crypto symbols
  if (KNOWN_CRYPTO.has(upperSymbol)) {
    return true;
  }
  
  // Check if base is known crypto (e.g., BTC/USD -> BTC)
  const basePart = upperSymbol.split(/[/\-_]/)[0];
  if (KNOWN_CRYPTO.has(basePart)) {
    return true;
  }
  
  return false;
}

/**
 * Determine if a symbol is a stock
 */
function isStockSymbol(symbol: string): boolean {
  const upperSymbol = symbol.toUpperCase();
  
  // Check known stocks
  if (KNOWN_STOCKS.has(upperSymbol)) {
    return true;
  }
  
  // Stocks typically are 1-5 letter uppercase symbols without numbers
  // and don't have crypto suffixes
  if (/^[A-Z]{1,5}$/.test(upperSymbol) && !isCryptoSymbol(upperSymbol)) {
    return true;
  }
  
  return false;
}

/**
 * Normalize symbol for Binance Futures (e.g., BTC -> BTCUSDT)
 */
function normalizeBinanceSymbol(symbol: string): string {
  const upperSymbol = symbol.toUpperCase().replace(/[/\-_\s]/g, '');
  
  // Already has a suffix
  for (const suffix of CRYPTO_SUFFIXES) {
    if (upperSymbol.endsWith(suffix)) {
      return upperSymbol;
    }
  }
  
  // Add USDT by default for Binance Futures
  return `${upperSymbol}USDT`;
}

/**
 * Normalize symbol for IBKR (stocks)
 */
function normalizeIBKRSymbol(symbol: string): string {
  // Remove any suffixes, take the base symbol
  const upperSymbol = symbol.toUpperCase();
  return upperSymbol.split(/[/\-_\s]/)[0];
}

/**
 * Route a signal to the appropriate exchange
 */
export function routeSignal(signal: ParsedSignal): RouteDecision {
  const { symbol, exchange: hintExchange, market: hintMarket } = signal;
  
  // If signal already has explicit exchange/market hints, use them
  if (hintExchange && hintMarket) {
    logger.debug('Using signal hints', { exchange: hintExchange, market: hintMarket });
    return {
      exchange: hintExchange,
      market: hintMarket,
      symbol: hintExchange === Exchange.BINANCE 
        ? normalizeBinanceSymbol(symbol) 
        : normalizeIBKRSymbol(symbol),
      confidence: 1.0,
    };
  }
  
  // Auto-detect based on symbol
  const isCrypto = isCryptoSymbol(symbol);
  const isStock = isStockSymbol(symbol);
  
  let decision: RouteDecision;
  
  if (isCrypto && !isStock) {
    decision = {
      exchange: Exchange.BINANCE,
      market: Market.FUTURES,
      symbol: normalizeBinanceSymbol(symbol),
      confidence: 0.95,
    };
  } else if (isStock && !isCrypto) {
    decision = {
      exchange: Exchange.IBKR,
      market: Market.STOCK,
      symbol: normalizeIBKRSymbol(symbol),
      confidence: 0.95,
    };
  } else if (isCrypto && isStock) {
    // Ambiguous - prefer crypto for this trading bot context
    logger.warn('Ambiguous symbol, defaulting to crypto', { symbol });
    decision = {
      exchange: Exchange.BINANCE,
      market: Market.FUTURES,
      symbol: normalizeBinanceSymbol(symbol),
      confidence: 0.7,
    };
  } else {
    // Unknown - assume crypto (main use case for this bot)
    logger.warn('Unknown symbol type, defaulting to crypto', { symbol });
    decision = {
      exchange: Exchange.BINANCE,
      market: Market.FUTURES,
      symbol: normalizeBinanceSymbol(symbol),
      confidence: 0.5,
    };
  }
  
  logger.info('Signal routed', {
    originalSymbol: symbol,
    exchange: decision.exchange,
    market: decision.market,
    normalizedSymbol: decision.symbol,
    confidence: decision.confidence,
  });
  
  return decision;
}

/**
 * Check if Binance should handle this signal
 */
export function shouldRouteToBinance(signal: ParsedSignal): boolean {
  const decision = routeSignal(signal);
  return decision.exchange === Exchange.BINANCE;
}

/**
 * Check if IBKR should handle this signal
 */
export function shouldRouteToIBKR(signal: ParsedSignal): boolean {
  const decision = routeSignal(signal);
  return decision.exchange === Exchange.IBKR;
}
