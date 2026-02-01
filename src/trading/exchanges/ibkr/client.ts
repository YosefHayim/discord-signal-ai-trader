import { IBApi, EventName, Contract, Order, OrderAction, OrderType, SecType, OrderStatus, ErrorCode } from '@stoqey/ib';
import { createLogger } from '../../../utils/logger.js';
import type { IBKRConfig, IBKROrderResult, IBKRPosition } from './types.js';

const logger = createLogger('ibkr');

let ib: IBApi | null = null;
let _config: IBKRConfig | null = null;
let nextOrderId: number = 0;
let isConnected: boolean = false;
const positions: Map<string, IBKRPosition> = new Map();

export function initializeIBKR(ibkrConfig: IBKRConfig): void {
  if (ib) {
    logger.warn('IBKR client already initialized');
    return;
  }

  _config = ibkrConfig;
  
  ib = new IBApi({
    clientId: ibkrConfig.clientId,
    host: ibkrConfig.host,
    port: ibkrConfig.port,
  });

  setupEventHandlers();
  
  logger.info('IBKR client initialized', {
    host: ibkrConfig.host,
    port: ibkrConfig.port,
    clientId: ibkrConfig.clientId,
  });
}

function setupEventHandlers(): void {
  if (!ib) return;

  ib.on(EventName.connected, () => {
    isConnected = true;
    logger.info('Connected to IBKR');
    ib?.reqIds();
  });

  ib.on(EventName.disconnected, () => {
    isConnected = false;
    logger.warn('Disconnected from IBKR');
  });

  ib.on(EventName.error, (err: Error, code: ErrorCode, reqId: number) => {
    logger.error('IBKR error', { error: err.message, code, reqId });
  });

  ib.on(EventName.nextValidId, (orderId: number) => {
    nextOrderId = orderId;
    logger.debug('Next valid order ID', { orderId });
  });

  ib.on(EventName.position, (account: string, contract: Contract, pos: number, avgCost?: number) => {
    const symbol = contract.symbol || '';
    if (pos !== 0) {
      positions.set(symbol, {
        symbol,
        position: pos,
        avgCost: avgCost ?? 0,
      });
    } else {
      positions.delete(symbol);
    }
    logger.debug('Position update', { symbol, position: pos, avgCost });
  });

  ib.on(EventName.orderStatus, (
    orderId: number,
    status: OrderStatus,
    filled: number,
    remaining: number,
    avgFillPrice: number
  ) => {
    logger.info('Order status', { orderId, status, filled, remaining, avgFillPrice });
  });
}

export async function connectIBKR(): Promise<void> {
  if (!ib) {
    throw new Error('IBKR not initialized. Call initializeIBKR first.');
  }

  if (isConnected) {
    logger.debug('Already connected to IBKR');
    return;
  }

  logger.info('Connecting to IBKR...');
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('IBKR connection timeout'));
    }, 10000);

    ib!.once(EventName.connected, () => {
      clearTimeout(timeout);
      resolve();
    });

    ib!.once(EventName.error, (err: Error) => {
      clearTimeout(timeout);
      reject(err);
    });

    ib!.connect();
  });
}

function createStockContract(symbol: string): Contract {
  return {
    symbol: symbol.toUpperCase(),
    secType: SecType.STK,
    exchange: 'SMART',
    currency: 'USD',
  };
}

function getNextOrderId(): number {
  return nextOrderId++;
}

export async function placeMarketOrder(
  symbol: string,
  action: 'BUY' | 'SELL',
  quantity: number
): Promise<IBKROrderResult> {
  if (!ib || !isConnected) {
    throw new Error('IBKR not connected');
  }

  const orderId = getNextOrderId();
  const contract = createStockContract(symbol);
  
  const order: Order = {
    orderId,
    action: action === 'BUY' ? OrderAction.BUY : OrderAction.SELL,
    orderType: OrderType.MKT,
    totalQuantity: quantity,
    transmit: true,
  };

  logger.info('Placing IBKR market order', { orderId, symbol, action, quantity });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Order timeout'));
    }, 30000);

    const statusHandler = (
      statusOrderId: number,
      status: OrderStatus,
      filled: number,
      remaining: number,
      avgFillPrice: number
    ) => {
      if (statusOrderId === orderId) {
        if (status === OrderStatus.Filled || status === OrderStatus.Submitted || status === OrderStatus.PreSubmitted) {
          clearTimeout(timeout);
          ib!.off(EventName.orderStatus, statusHandler);
          resolve({
            orderId,
            symbol,
            action,
            quantity,
            orderType: 'MARKET',
            status,
            avgFillPrice,
          });
        } else if (status === OrderStatus.Cancelled) {
          clearTimeout(timeout);
          ib!.off(EventName.orderStatus, statusHandler);
          reject(new Error(`Order ${status}`));
        }
      }
    };

    ib!.on(EventName.orderStatus, statusHandler);
    ib!.placeOrder(orderId, contract, order);
  });
}

export async function placeLimitOrder(
  symbol: string,
  action: 'BUY' | 'SELL',
  quantity: number,
  price: number
): Promise<IBKROrderResult> {
  if (!ib || !isConnected) {
    throw new Error('IBKR not connected');
  }

  const orderId = getNextOrderId();
  const contract = createStockContract(symbol);
  
  const order: Order = {
    orderId,
    action: action === 'BUY' ? OrderAction.BUY : OrderAction.SELL,
    orderType: OrderType.LMT,
    totalQuantity: quantity,
    lmtPrice: price,
    transmit: true,
  };

  logger.info('Placing IBKR limit order', { orderId, symbol, action, quantity, price });

  ib.placeOrder(orderId, contract, order);

  return {
    orderId,
    symbol,
    action,
    quantity,
    orderType: 'LIMIT',
    status: 'Submitted',
  };
}

export async function placeStopOrder(
  symbol: string,
  action: 'BUY' | 'SELL',
  quantity: number,
  stopPrice: number
): Promise<IBKROrderResult> {
  if (!ib || !isConnected) {
    throw new Error('IBKR not connected');
  }

  const orderId = getNextOrderId();
  const contract = createStockContract(symbol);
  
  const order: Order = {
    orderId,
    action: action === 'BUY' ? OrderAction.BUY : OrderAction.SELL,
    orderType: OrderType.STP,
    totalQuantity: quantity,
    auxPrice: stopPrice,
    transmit: true,
  };

  logger.info('Placing IBKR stop order', { orderId, symbol, action, quantity, stopPrice });

  ib.placeOrder(orderId, contract, order);

  return {
    orderId,
    symbol,
    action,
    quantity,
    orderType: 'STOP',
    status: 'Submitted',
  };
}

export function cancelOrder(orderId: number): void {
  if (!ib || !isConnected) {
    throw new Error('IBKR not connected');
  }

  logger.info('Cancelling IBKR order', { orderId });
  ib.cancelOrder(orderId);
}

export function getPositions(): IBKRPosition[] {
  return Array.from(positions.values());
}

export function getPosition(symbol: string): IBKRPosition | null {
  return positions.get(symbol.toUpperCase()) || null;
}

export async function requestPositions(): Promise<void> {
  if (!ib || !isConnected) {
    throw new Error('IBKR not connected');
  }

  positions.clear();
  ib.reqPositions();
  
  // Wait a moment for positions to arrive
  await new Promise(resolve => setTimeout(resolve, 2000));
}

export async function closePosition(symbol: string): Promise<IBKROrderResult | null> {
  const position = getPosition(symbol);
  if (!position || position.position === 0) {
    logger.info('No position to close', { symbol });
    return null;
  }

  const action = position.position > 0 ? 'SELL' : 'BUY';
  const quantity = Math.abs(position.position);

  return placeMarketOrder(symbol, action, quantity);
}

export function isIBKRConnected(): boolean {
  return isConnected;
}

export function isIBKRInitialized(): boolean {
  return ib !== null;
}

export async function disconnectIBKR(): Promise<void> {
  if (ib) {
    logger.info('Disconnecting from IBKR');
    ib.disconnect();
    ib = null;
    isConnected = false;
    positions.clear();
  }
}
