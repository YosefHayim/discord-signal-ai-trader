import { createLogger } from '../utils/logger.js';
import { 
  parseSymbol, 
  toBinanceSymbol, 
  toIBKRSymbol, 
  isCryptoSymbol, 
  isStockSymbol 
} from '../utils/symbol.js';
import { Exchange, Market, type ParsedSignal } from '../types/index.js';

const logger = createLogger('trade-router');

export interface RouteDecision {
  exchange: Exchange;
  market: Market;
  symbol: string;
  confidence: number;
}

export function routeSignal(signal: ParsedSignal): RouteDecision {
  const { symbol, exchange: hintExchange, market: hintMarket } = signal;

  if (hintExchange && hintMarket) {
    logger.debug('Using signal hints', { exchange: hintExchange, market: hintMarket });
    return {
      exchange: hintExchange,
      market: hintMarket,
      symbol: hintExchange === Exchange.BINANCE 
        ? toBinanceSymbol(symbol) 
        : toIBKRSymbol(symbol),
      confidence: 1.0,
    };
  }

  const isCrypto = isCryptoSymbol(symbol);
  const isStock = isStockSymbol(symbol);

  let decision: RouteDecision;

  if (isCrypto && !isStock) {
    decision = {
      exchange: Exchange.BINANCE,
      market: Market.FUTURES,
      symbol: toBinanceSymbol(symbol),
      confidence: 0.95,
    };
  } else if (isStock && !isCrypto) {
    decision = {
      exchange: Exchange.IBKR,
      market: Market.STOCK,
      symbol: toIBKRSymbol(symbol),
      confidence: 0.95,
    };
  } else if (isCrypto && isStock) {
    logger.warn('Ambiguous symbol, defaulting to crypto', { symbol });
    decision = {
      exchange: Exchange.BINANCE,
      market: Market.FUTURES,
      symbol: toBinanceSymbol(symbol),
      confidence: 0.7,
    };
  } else {
    logger.warn('Unknown symbol type, defaulting to crypto', { symbol });
    decision = {
      exchange: Exchange.BINANCE,
      market: Market.FUTURES,
      symbol: toBinanceSymbol(symbol),
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

export function shouldRouteToBinance(signal: ParsedSignal): boolean {
  const decision = routeSignal(signal);
  return decision.exchange === Exchange.BINANCE;
}

export function shouldRouteToIBKR(signal: ParsedSignal): boolean {
  const decision = routeSignal(signal);
  return decision.exchange === Exchange.IBKR;
}
