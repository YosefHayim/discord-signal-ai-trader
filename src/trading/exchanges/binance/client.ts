import crypto from 'node:crypto';
import { createLogger } from '../../../utils/logger.js';
import { retry, isRateLimitError } from '../../../utils/retry.js';
import type { BinanceConfig, BinanceOrderResult, BinancePosition, BinanceBalance } from './types.js';

const logger = createLogger('binance');

// Binance API endpoints
const FUTURES_MAINNET = 'https://fapi.binance.com';
const FUTURES_TESTNET = 'https://testnet.binancefuture.com';

let config: BinanceConfig | null = null;
let baseUrl: string = FUTURES_TESTNET;

export function initializeBinance(binanceConfig: BinanceConfig): void {
  config = binanceConfig;
  baseUrl = binanceConfig.testnet ? FUTURES_TESTNET : FUTURES_MAINNET;
  logger.info('Binance client initialized', { 
    testnet: binanceConfig.testnet,
    baseUrl,
  });
}

function getSignature(queryString: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
}

async function signedRequest(
  method: 'GET' | 'POST' | 'DELETE',
  endpoint: string,
  params: Record<string, string | number> = {}
): Promise<unknown> {
  if (!config) throw new Error('Binance not initialized');

  const timestamp = Date.now();
  const queryParams = new URLSearchParams({
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ),
    timestamp: String(timestamp),
  });
  
  const signature = getSignature(queryParams.toString(), config.apiSecret);
  queryParams.append('signature', signature);

  const url = `${baseUrl}${endpoint}?${queryParams.toString()}`;
  
  const response = await fetch(url, {
    method,
    headers: {
      'X-MBX-APIKEY': config.apiKey,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ msg: response.statusText })) as { msg?: string };
    throw new Error(`Binance API error: ${error.msg || response.statusText}`);
  }

  return response.json();
}

export async function placeMarketOrder(
  symbol: string,
  side: 'BUY' | 'SELL',
  quantity: number
): Promise<BinanceOrderResult> {
  logger.info('Placing market order', { symbol, side, quantity });

  const result = await retry(
    () => signedRequest('POST', '/fapi/v1/order', {
      symbol: symbol.toUpperCase(),
      side,
      type: 'MARKET',
      quantity,
    }),
    { maxAttempts: 3, retryableErrors: isRateLimitError }
  ) as Record<string, unknown>;

  return {
    orderId: String(result.orderId),
    symbol: String(result.symbol),
    side: result.side as 'BUY' | 'SELL',
    type: String(result.type),
    quantity: Number(result.origQty),
    status: String(result.status),
    executedQty: Number(result.executedQty),
    avgPrice: Number(result.avgPrice),
  };
}

export async function placeLimitOrder(
  symbol: string,
  side: 'BUY' | 'SELL',
  quantity: number,
  price: number
): Promise<BinanceOrderResult> {
  logger.info('Placing limit order', { symbol, side, quantity, price });

  const result = await retry(
    () => signedRequest('POST', '/fapi/v1/order', {
      symbol: symbol.toUpperCase(),
      side,
      type: 'LIMIT',
      timeInForce: 'GTC',
      quantity,
      price,
    }),
    { maxAttempts: 3, retryableErrors: isRateLimitError }
  ) as Record<string, unknown>;

  return {
    orderId: String(result.orderId),
    symbol: String(result.symbol),
    side: result.side as 'BUY' | 'SELL',
    type: String(result.type),
    quantity: Number(result.origQty),
    price: Number(result.price),
    status: String(result.status),
  };
}

export async function placeStopLossOrder(
  symbol: string,
  side: 'BUY' | 'SELL',
  quantity: number,
  stopPrice: number
): Promise<BinanceOrderResult> {
  logger.info('Placing stop loss order', { symbol, side, quantity, stopPrice });

  const result = await retry(
    () => signedRequest('POST', '/fapi/v1/order', {
      symbol: symbol.toUpperCase(),
      side,
      type: 'STOP_MARKET',
      stopPrice,
      quantity,
      workingType: 'MARK_PRICE',
    }),
    { maxAttempts: 3, retryableErrors: isRateLimitError }
  ) as Record<string, unknown>;

  return {
    orderId: String(result.orderId),
    symbol: String(result.symbol),
    side: result.side as 'BUY' | 'SELL',
    type: String(result.type),
    quantity: Number(result.origQty),
    status: String(result.status),
  };
}

export async function placeTakeProfitOrder(
  symbol: string,
  side: 'BUY' | 'SELL',
  quantity: number,
  stopPrice: number
): Promise<BinanceOrderResult> {
  logger.info('Placing take profit order', { symbol, side, quantity, stopPrice });

  const result = await retry(
    () => signedRequest('POST', '/fapi/v1/order', {
      symbol: symbol.toUpperCase(),
      side,
      type: 'TAKE_PROFIT_MARKET',
      stopPrice,
      quantity,
      workingType: 'MARK_PRICE',
    }),
    { maxAttempts: 3, retryableErrors: isRateLimitError }
  ) as Record<string, unknown>;

  return {
    orderId: String(result.orderId),
    symbol: String(result.symbol),
    side: result.side as 'BUY' | 'SELL',
    type: String(result.type),
    quantity: Number(result.origQty),
    status: String(result.status),
  };
}

export async function cancelOrder(symbol: string, orderId: string): Promise<void> {
  logger.info('Cancelling order', { symbol, orderId });

  await retry(
    () => signedRequest('DELETE', '/fapi/v1/order', {
      symbol: symbol.toUpperCase(),
      orderId,
    }),
    { maxAttempts: 3, retryableErrors: isRateLimitError }
  );
}

export async function setLeverage(symbol: string, leverage: number): Promise<void> {
  logger.info('Setting leverage', { symbol, leverage });

  await retry(
    () => signedRequest('POST', '/fapi/v1/leverage', {
      symbol: symbol.toUpperCase(),
      leverage,
    }),
    { maxAttempts: 3, retryableErrors: isRateLimitError }
  );
}

export async function getPosition(symbol: string): Promise<BinancePosition | null> {
  const positions = await retry(
    () => signedRequest('GET', '/fapi/v2/positionRisk', {
      symbol: symbol.toUpperCase(),
    }),
    { maxAttempts: 3, retryableErrors: isRateLimitError }
  ) as Array<Record<string, unknown>>;

  const pos = positions[0];
  if (!pos || Number(pos.positionAmt) === 0) return null;

  return {
    symbol: String(pos.symbol),
    positionAmt: Number(pos.positionAmt),
    entryPrice: Number(pos.entryPrice),
    markPrice: Number(pos.markPrice),
    unrealizedProfit: Number(pos.unRealizedProfit),
    liquidationPrice: Number(pos.liquidationPrice),
    leverage: Number(pos.leverage),
    marginType: String(pos.marginType),
  };
}

export async function getAllPositions(): Promise<BinancePosition[]> {
  const positions = await retry(
    () => signedRequest('GET', '/fapi/v2/positionRisk'),
    { maxAttempts: 3, retryableErrors: isRateLimitError }
  ) as Array<Record<string, unknown>>;

  return positions
    .filter(pos => Number(pos.positionAmt) !== 0)
    .map(pos => ({
      symbol: String(pos.symbol),
      positionAmt: Number(pos.positionAmt),
      entryPrice: Number(pos.entryPrice),
      markPrice: Number(pos.markPrice),
      unrealizedProfit: Number(pos.unRealizedProfit),
      liquidationPrice: Number(pos.liquidationPrice),
      leverage: Number(pos.leverage),
      marginType: String(pos.marginType),
    }));
}

export async function getBalance(): Promise<BinanceBalance[]> {
  const account = await retry(
    () => signedRequest('GET', '/fapi/v2/account'),
    { maxAttempts: 3, retryableErrors: isRateLimitError }
  ) as Record<string, unknown>;

  const assets = account.assets as Array<Record<string, unknown>>;
  
  return assets
    .filter(a => Number(a.walletBalance) > 0)
    .map(a => ({
      asset: String(a.asset),
      balance: Number(a.walletBalance),
      availableBalance: Number(a.availableBalance),
    }));
}

export async function closePosition(symbol: string): Promise<BinanceOrderResult | null> {
  const position = await getPosition(symbol);
  if (!position) {
    logger.info('No position to close', { symbol });
    return null;
  }

  const side = position.positionAmt > 0 ? 'SELL' : 'BUY';
  const quantity = Math.abs(position.positionAmt);

  return placeMarketOrder(symbol, side, quantity);
}

export function isBinanceInitialized(): boolean {
  return config !== null;
}

export function closeBinance(): void {
  config = null;
  logger.info('Binance client closed');
}
