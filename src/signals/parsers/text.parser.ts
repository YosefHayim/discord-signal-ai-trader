import { createLogger } from '../../utils/logger.js';
import { cleanSymbol, isCryptoSymbol, isStockSymbol } from '../../utils/symbol.js';
import { CONFIDENCE_WEIGHTS } from '../../config/constants.js';
import type { ParsedSignal, SignalAction } from '../../types/index.js';

const logger = createLogger('text-parser');

const PATTERNS = {
  format1: /([A-Z]{2,10})(?:\/USDT?)?\s+(LONG|SHORT|BUY|SELL)\s*@?\s*(\d+(?:\.\d+)?)\s*(?:,?\s*(?:SL|STOP|STOPLOSS)[:\s]*(\d+(?:\.\d+)?))?\s*(?:,?\s*(?:TP|TARGET|TAKEPROFIT)[:\s]*(\d+(?:\.\d+)?))?/i,
  format2: /(LONG|SHORT|BUY|SELL)\s+([A-Z]{2,10})(?:\/USDT?)?\s+(\d+(?:\.\d+)?)\s*(?:(?:SL|STOP)[:\s]*(\d+(?:\.\d+)?))?\s*(?:(?:TP|TARGET)[:\s]*(\d+(?:\.\d+)?))?/i,
  format3: /([A-Z]{2,10})(?:\/USDT?)?\s+(LONG|SHORT)\s+(?:Entry|Price)[:\s]*(\d+(?:\.\d+)?)\s*(?:(?:Stop|StopLoss)[:\s]*(\d+(?:\.\d+)?))?\s*(?:(?:Target|TP|TakeProfit)[:\s]*(\d+(?:\.\d+)?))?/i,
  simple: /([A-Z]{2,10})(?:\/USDT?)?\s+(\d+(?:\.\d+)?)\s+(LONG|SHORT)/i,
  reverse: /(\d+(?:\.\d+)?)\s+([A-Z]{2,10})(?:\/USDT?)?\s+(LONG|SHORT)/i,
};

function normalizeAction(action: string): SignalAction {
  const upper = action.toUpperCase();
  if (upper === 'BUY' || upper === 'LONG') return 'LONG';
  if (upper === 'SELL' || upper === 'SHORT') return 'SHORT';
  return 'LONG';
}

function calculateConfidence(
  hasEntry: boolean,
  hasStopLoss: boolean,
  hasTakeProfit: boolean,
  symbolRecognized: boolean
): number {
  let confidence = CONFIDENCE_WEIGHTS.BASE;

  if (hasEntry) confidence += CONFIDENCE_WEIGHTS.HAS_ENTRY;
  if (hasStopLoss) confidence += CONFIDENCE_WEIGHTS.HAS_STOP_LOSS;
  if (hasTakeProfit) confidence += CONFIDENCE_WEIGHTS.HAS_TAKE_PROFIT;
  if (symbolRecognized) confidence += CONFIDENCE_WEIGHTS.SYMBOL_RECOGNIZED;

  return Math.min(confidence, 1.0);
}

function isRecognizedSymbol(symbol: string): boolean {
  const clean = cleanSymbol(symbol);
  return isCryptoSymbol(clean) || isStockSymbol(clean);
}

export function parseTextSignal(text: string): ParsedSignal | null {
  if (!text || text.trim().length === 0) {
    return null;
  }

  const content = text.trim();
  logger.debug('Parsing text signal', { content: content.substring(0, 100) });

  for (const [patternName, pattern] of Object.entries(PATTERNS)) {
    const match = content.match(pattern);

    if (match) {
      logger.debug('Pattern matched', { pattern: patternName });

      let symbol: string;
      let action: SignalAction;
      let entry: number;
      let stopLoss: number | undefined;
      let takeProfit: number | undefined;

      if (patternName === 'format2') {
        action = normalizeAction(match[1]);
        symbol = cleanSymbol(match[2]);
        entry = parseFloat(match[3]);
        stopLoss = match[4] ? parseFloat(match[4]) : undefined;
        takeProfit = match[5] ? parseFloat(match[5]) : undefined;
      } else if (patternName === 'simple') {
        symbol = cleanSymbol(match[1]);
        entry = parseFloat(match[2]);
        action = normalizeAction(match[3]);
      } else if (patternName === 'reverse') {
        entry = parseFloat(match[1]);
        symbol = cleanSymbol(match[2]);
        action = normalizeAction(match[3]);
      } else {
        symbol = cleanSymbol(match[1]);
        action = normalizeAction(match[2]);
        entry = parseFloat(match[3]);
        stopLoss = match[4] ? parseFloat(match[4]) : undefined;
        takeProfit = match[5] ? parseFloat(match[5]) : undefined;
      }

      if (isNaN(entry) || entry <= 0) {
        logger.debug('Invalid entry price', { entry });
        continue;
      }

      const symbolRecognized = isRecognizedSymbol(symbol);
      const confidence = calculateConfidence(
        true,
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

export function extractPrices(text: string): number[] {
  const pricePattern = /\d+(?:\.\d+)?/g;
  const matches = text.match(pricePattern);
  if (!matches) return [];

  return matches
    .map(m => parseFloat(m))
    .filter(n => !isNaN(n) && n > 0);
}
