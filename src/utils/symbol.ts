import { CRYPTO_SYMBOLS, STOCK_SYMBOLS, CRYPTO_QUOTE_SUFFIXES } from '../config/constants.js';

const CRYPTO_SET = new Set<string>(CRYPTO_SYMBOLS);
const STOCK_SET = new Set<string>(STOCK_SYMBOLS);

export interface SymbolInfo {
  base: string;
  quote?: string;
  normalized: string;
  isCrypto: boolean;
  isStock: boolean;
}

export function parseSymbol(input: string): SymbolInfo {
  const upper = input.toUpperCase().trim();
  const clean = upper.replace(/[/\-_\s]/g, '');

  let base = clean;
  let quote: string | undefined;

  for (const suffix of CRYPTO_QUOTE_SUFFIXES) {
    if (clean.endsWith(suffix) && clean.length > suffix.length) {
      base = clean.slice(0, -suffix.length);
      quote = suffix;
      break;
    }
  }

  const isCrypto = CRYPTO_SET.has(base) || quote !== undefined;
  const isStock = STOCK_SET.has(base) && !isCrypto;

  return {
    base,
    quote,
    normalized: quote ? `${base}${quote}` : base,
    isCrypto,
    isStock,
  };
}

export function toBinanceSymbol(input: string): string {
  const info = parseSymbol(input);
  return info.quote ? info.normalized : `${info.base}USDT`;
}

export function toIBKRSymbol(input: string): string {
  return parseSymbol(input).base;
}

export function isCryptoSymbol(symbol: string): boolean {
  return parseSymbol(symbol).isCrypto;
}

export function isStockSymbol(symbol: string): boolean {
  return parseSymbol(symbol).isStock;
}

export function cleanSymbol(input: string): string {
  return input
    .toUpperCase()
    .replace(/[/\-_\s]/g, '')
    .replace(/USDT?$/, '')
    .replace(/PERP$/, '')
    .trim();
}
