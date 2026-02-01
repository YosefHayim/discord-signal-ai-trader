import { createLogger } from '../../utils/logger.js';
import type { ParsedSignal, SignalAction } from '../../types/index.js';

const logger = createLogger('text-parser');

// Common crypto symbols
const CRYPTO_SYMBOLS = [
  'BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'ADA', 'DOGE', 'DOT', 'MATIC', 'LINK',
  'AVAX', 'SHIB', 'LTC', 'UNI', 'ATOM', 'XLM', 'ALGO', 'VET', 'FIL', 'AAVE',
  'APE', 'SAND', 'MANA', 'AXS', 'NEAR', 'FTM', 'HBAR', 'ICP', 'EOS', 'XMR',
];

// Stock symbols (common ones)
const STOCK_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'AMD', 'INTC', 'SPY',
  'QQQ', 'DIA', 'IWM', 'NFLX', 'BABA', 'V', 'JPM', 'WMT', 'DIS', 'PYPL',
];

// Regex patterns for different signal formats
const PATTERNS = {
  // "BTC LONG @ 45000, SL 44000, TP 47000"
  format1: /([A-Z]{2,10})(?:\/USDT?)?\s+(LONG|SHORT|BUY|SELL)\s*@?\s*(\d+(?:\.\d+)?)\s*(?:,?\s*(?:SL|STOP|STOPLOSS)[:\s]*(\d+(?:\.\d+)?))?\s*(?:,?\s*(?:TP|TARGET|TAKEPROFIT)[:\s]*(\d+(?:\.\d+)?))?/i,
  
  // "LONG BTC 45000 SL:44000 TP:47000"
  format2: /(LONG|SHORT|BUY|SELL)\s+([A-Z]{2,10})(?:\/USDT?)?\s+(\d+(?:\.\d+)?)\s*(?:(?:SL|STOP)[:\s]*(\d+(?:\.\d+)?))?\s*(?:(?:TP|TARGET)[:\s]*(\d+(?:\.\d+)?))?/i,
  
  // "BTC/USDT LONG Entry: 45000 Stop: 44000 Target: 47000"
  format3: /([A-Z]{2,10})(?:\/USDT?)?\s+(LONG|SHORT)\s+(?:Entry|Price)[:\s]*(\d+(?:\.\d+)?)\s*(?:(?:Stop|StopLoss)[:\s]*(\d+(?:\.\d+)?))?\s*(?:(?:Target|TP|TakeProfit)[:\s]*(\d+(?:\.\d+)?))?/i,
  
  // Simple: "BTC 45000 LONG"
  simple: /([A-Z]{2,10})(?:\/USDT?)?\s+(\d+(?:\.\d+)?)\s+(LONG|SHORT)/i,
  
  // Reverse: "45000 BTC LONG"  
  reverse: /(\d+(?:\.\d+)?)\s+([A-Z]{2,10})(?:\/USDT?)?\s+(LONG|SHORT)/i,
};

// Normalize action to LONG/SHORT
function normalizeAction(action: string): SignalAction {
  const upper = action.toUpperCase();
  if (upper === 'BUY' || upper === 'LONG') return 'LONG';
  if (upper === 'SELL' || upper === 'SHORT') return 'SHORT';
  return 'LONG'; // Default
}

// Clean symbol (remove /USDT suffix, etc.)
function cleanSymbol(symbol: string): string {
  return symbol.toUpperCase().replace(/\/USDT?$/, '').trim();
}

// Calculate confidence based on matched fields
function calculateConfidence(
  hasEntry: boolean,
  hasStopLoss: boolean,
  hasTakeProfit: boolean,
  symbolRecognized: boolean
): number {
  let confidence = 0.3; // Base confidence for any match
  
  if (hasEntry) confidence += 0.2;
  if (hasStopLoss) confidence += 0.2;
  if (hasTakeProfit) confidence += 0.15;
  if (symbolRecognized) confidence += 0.15;
  
  return Math.min(confidence, 1.0);
}

// Check if symbol is recognized
function isRecognizedSymbol(symbol: string): boolean {
  const clean = cleanSymbol(symbol);
  return CRYPTO_SYMBOLS.includes(clean) || STOCK_SYMBOLS.includes(clean);
}

export function parseTextSignal(text: string): ParsedSignal | null {
  if (!text || text.trim().length === 0) {
    return null;
  }

  const content = text.trim();
  logger.debug('Parsing text signal', { content: content.substring(0, 100) });

  // Try each pattern
  for (const [patternName, pattern] of Object.entries(PATTERNS)) {
    const match = content.match(pattern);
    
    if (match) {
      logger.debug('Pattern matched', { pattern: patternName });
      
      let symbol: string;
      let action: SignalAction;
      let entry: number;
      let stopLoss: number | undefined;
      let takeProfit: number | undefined;
      
      // Different patterns have different group orders
      if (patternName === 'format2') {
        // LONG BTC 45000 SL:44000 TP:47000
        action = normalizeAction(match[1]);
        symbol = cleanSymbol(match[2]);
        entry = parseFloat(match[3]);
        stopLoss = match[4] ? parseFloat(match[4]) : undefined;
        takeProfit = match[5] ? parseFloat(match[5]) : undefined;
      } else if (patternName === 'simple') {
        // BTC 45000 LONG
        symbol = cleanSymbol(match[1]);
        entry = parseFloat(match[2]);
        action = normalizeAction(match[3]);
      } else if (patternName === 'reverse') {
        // 45000 BTC LONG
        entry = parseFloat(match[1]);
        symbol = cleanSymbol(match[2]);
        action = normalizeAction(match[3]);
      } else {
        // format1 and format3: SYMBOL ACTION @ ENTRY, SL, TP
        symbol = cleanSymbol(match[1]);
        action = normalizeAction(match[2]);
        entry = parseFloat(match[3]);
        stopLoss = match[4] ? parseFloat(match[4]) : undefined;
        takeProfit = match[5] ? parseFloat(match[5]) : undefined;
      }

      // Validate entry price
      if (isNaN(entry) || entry <= 0) {
        logger.debug('Invalid entry price', { entry });
        continue;
      }

      const symbolRecognized = isRecognizedSymbol(symbol);
      const confidence = calculateConfidence(
        true, // hasEntry
        !!stopLoss,
        !!takeProfit,
        symbolRecognized
      );

      const parsed: ParsedSignal = {
        symbol,
        action,
        entry,
        stopLoss,
        takeProfit,
        confidence,
      };

      logger.info('Signal parsed successfully', {
        symbol: parsed.symbol,
        action: parsed.action,
        entry: parsed.entry,
        confidence: parsed.confidence,
      });

      return parsed;
    }
  }

  logger.debug('No pattern matched', { content: content.substring(0, 50) });
  return null;
}

// Extract multiple prices from text (for multiple TPs)
export function extractPrices(text: string): number[] {
  const pricePattern = /\d+(?:\.\d+)?/g;
  const matches = text.match(pricePattern);
  if (!matches) return [];
  
  return matches
    .map(m => parseFloat(m))
    .filter(n => !isNaN(n) && n > 0);
}
