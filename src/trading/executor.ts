import { createLogger } from '../utils/logger.js';
import { getErrorMessage } from '../utils/errors.js';
import { routeSignal, type RouteDecision } from './router.js';
import * as binance from './exchanges/binance/client.js';
import * as ibkr from './exchanges/ibkr/client.js';
import * as positionManager from './position-manager.js';
import { 
  notifySignalReceived, 
  notifyTradeExecuted, 
  notifySimulatedTrade,
  notifyLowConfidence,
} from '../telegram/notifications/trade.notification.js';
import { notifyError } from '../telegram/notifications/error.notification.js';
import { tradeRepository } from '../database/index.js';
import {
  Exchange,
  Market,
  PositionSide,
  PositionStatus,
  TradeStatus,
  OrderSide,
  OrderType,
  validateParsedSignal,
  type Signal,
  type ParsedSignal,
  type Trade,
  type OrderInfo,
} from '../types/index.js';

const logger = createLogger('executor');

interface ExecutorConfig {
  simulationMode: boolean;
  defaultPositionSize: number;
  defaultLeverage: number;
  confidenceThreshold: number;
}

let config: ExecutorConfig = {
  simulationMode: true,
  defaultPositionSize: 100,
  defaultLeverage: 1,
  confidenceThreshold: 0.7,
};

export function configureExecutor(options: Partial<ExecutorConfig>): void {
  config = { ...config, ...options };
  logger.info('Executor configured', { 
    simulationMode: config.simulationMode,
    defaultPositionSize: config.defaultPositionSize,
    defaultLeverage: config.defaultLeverage,
    confidenceThreshold: config.confidenceThreshold,
  });
}

function getPositionSide(action: 'LONG' | 'SHORT'): PositionSide {
  return action === 'LONG' ? PositionSide.LONG : PositionSide.SHORT;
}

function getOrderSide(action: 'LONG' | 'SHORT', isClosing: boolean): OrderSide {
  if (action === 'LONG') {
    return isClosing ? OrderSide.SELL : OrderSide.BUY;
  }
  return isClosing ? OrderSide.BUY : OrderSide.SELL;
}

function calculateQuantity(
  entryPrice: number, 
  positionSize: number, 
  leverage: number
): number {
  const notionalValue = positionSize * leverage;
  return notionalValue / entryPrice;
}

async function executeBinanceTrade(
  signal: Signal,
  parsed: ParsedSignal,
  route: RouteDecision
): Promise<Trade> {
  const leverage = parsed.leverage || config.defaultLeverage;
  const quantity = calculateQuantity(
    parsed.entry, 
    config.defaultPositionSize, 
    leverage
  );
  
  const side = getOrderSide(parsed.action, false);
  const orders: OrderInfo[] = [];
  
  logger.info('Executing Binance trade', {
    symbol: route.symbol,
    side,
    quantity,
    leverage,
  });

  await binance.setLeverage(route.symbol, leverage);
  
  const mainOrder = await binance.placeMarketOrder(
    route.symbol,
    side === OrderSide.BUY ? 'BUY' : 'SELL',
    quantity
  );
  
  orders.push({
    orderId: mainOrder.orderId,
    type: OrderType.MARKET,
    side,
    quantity: mainOrder.executedQty || quantity,
    status: mainOrder.status,
    avgPrice: mainOrder.avgPrice,
    createdAt: new Date(),
  });

  const closingSide = side === OrderSide.BUY ? 'SELL' : 'BUY';
  
  if (parsed.stopLoss) {
    try {
      const slOrder = await binance.placeStopLossOrder(
        route.symbol,
        closingSide,
        quantity,
        parsed.stopLoss
      );
      orders.push({
        orderId: slOrder.orderId,
        type: OrderType.STOP_LOSS,
        side: closingSide === 'BUY' ? OrderSide.BUY : OrderSide.SELL,
        price: parsed.stopLoss,
        quantity,
        status: slOrder.status,
        createdAt: new Date(),
      });
    } catch (err) {
      logger.error('Failed to place stop loss', { error: getErrorMessage(err) });
    }
  }

  if (parsed.takeProfit) {
    const tpPrice = Array.isArray(parsed.takeProfit) ? parsed.takeProfit[0] : parsed.takeProfit;
    try {
      const tpOrder = await binance.placeTakeProfitOrder(
        route.symbol,
        closingSide,
        quantity,
        tpPrice
      );
      orders.push({
        orderId: tpOrder.orderId,
        type: OrderType.TAKE_PROFIT,
        side: closingSide === 'BUY' ? OrderSide.BUY : OrderSide.SELL,
        price: tpPrice,
        quantity,
        status: tpOrder.status,
        createdAt: new Date(),
      });
    } catch (err) {
      logger.error('Failed to place take profit', { error: getErrorMessage(err) });
    }
  }

  const entryPrice = mainOrder.avgPrice || parsed.entry;
  
  const trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'> = {
    signalId: signal.id,
    exchange: Exchange.BINANCE,
    market: Market.FUTURES,
    symbol: route.symbol,
    side,
    quantity: mainOrder.executedQty || quantity,
    entryPrice,
    stopLoss: parsed.stopLoss,
    takeProfit: Array.isArray(parsed.takeProfit) ? parsed.takeProfit[0] : parsed.takeProfit,
    leverage,
    status: TradeStatus.OPEN,
    orders,
  };

  const savedTrade = await tradeRepository.create(trade);

  await positionManager.openPosition({
    tradeId: savedTrade.id,
    exchange: Exchange.BINANCE,
    market: Market.FUTURES,
    symbol: route.symbol,
    side: getPositionSide(parsed.action),
    quantity: trade.quantity,
    entryPrice,
    stopLoss: parsed.stopLoss,
    takeProfit: trade.takeProfit,
    leverage,
    status: PositionStatus.OPEN,
    openedAt: new Date(),
  });

  return savedTrade;
}

async function executeIBKRTrade(
  signal: Signal,
  parsed: ParsedSignal,
  route: RouteDecision
): Promise<Trade> {
  const quantity = Math.floor(config.defaultPositionSize / parsed.entry);
  const side = getOrderSide(parsed.action, false);
  const orders: OrderInfo[] = [];
  
  logger.info('Executing IBKR trade', {
    symbol: route.symbol,
    side,
    quantity,
  });

  const mainOrder = await ibkr.placeMarketOrder(
    route.symbol,
    side === OrderSide.BUY ? 'BUY' : 'SELL',
    quantity
  );
  
  orders.push({
    orderId: String(mainOrder.orderId),
    type: OrderType.MARKET,
    side,
    quantity,
    status: mainOrder.status,
    avgPrice: mainOrder.avgFillPrice,
    createdAt: new Date(),
  });

  if (parsed.stopLoss) {
    const closingSide = side === OrderSide.BUY ? 'SELL' : 'BUY';
    try {
      const slOrder = await ibkr.placeStopOrder(
        route.symbol,
        closingSide,
        quantity,
        parsed.stopLoss
      );
      orders.push({
        orderId: String(slOrder.orderId),
        type: OrderType.STOP_LOSS,
        side: closingSide === 'BUY' ? OrderSide.BUY : OrderSide.SELL,
        price: parsed.stopLoss,
        quantity,
        status: slOrder.status,
        createdAt: new Date(),
      });
    } catch (err) {
      logger.error('Failed to place IBKR stop loss', { error: getErrorMessage(err) });
    }
  }

  const entryPrice = mainOrder.avgFillPrice || parsed.entry;
  
  const trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'> = {
    signalId: signal.id,
    exchange: Exchange.IBKR,
    market: Market.STOCK,
    symbol: route.symbol,
    side,
    quantity,
    entryPrice,
    stopLoss: parsed.stopLoss,
    takeProfit: Array.isArray(parsed.takeProfit) ? parsed.takeProfit[0] : parsed.takeProfit,
    leverage: 1,
    status: TradeStatus.OPEN,
    orders,
  };

  const savedTrade = await tradeRepository.create(trade);

  await positionManager.openPosition({
    tradeId: savedTrade.id,
    exchange: Exchange.IBKR,
    market: Market.STOCK,
    symbol: route.symbol,
    side: getPositionSide(parsed.action),
    quantity,
    entryPrice,
    stopLoss: parsed.stopLoss,
    takeProfit: trade.takeProfit,
    leverage: 1,
    status: PositionStatus.OPEN,
    openedAt: new Date(),
  });

  return savedTrade;
}

async function executeSimulatedTrade(
  signal: Signal,
  parsed: ParsedSignal,
  route: RouteDecision
): Promise<void> {
  logger.info('SIMULATION: Would execute trade', {
    signalId: signal.id,
    symbol: route.symbol,
    exchange: route.exchange,
    market: route.market,
    action: parsed.action,
    entry: parsed.entry,
    stopLoss: parsed.stopLoss,
    takeProfit: parsed.takeProfit,
    leverage: parsed.leverage || config.defaultLeverage,
    positionSize: config.defaultPositionSize,
  });

  await notifySimulatedTrade(parsed);
}

export async function executeSignal(signal: Signal, parsed: ParsedSignal): Promise<void> {
  logger.info('Executing signal', { 
    signalId: signal.id, 
    symbol: parsed.symbol,
    action: parsed.action,
    confidence: parsed.confidence,
  });

  try {
    const validatedSignal = validateParsedSignal(parsed);
    
    await notifySignalReceived(validatedSignal, signal.source);

    if (validatedSignal.confidence < config.confidenceThreshold) {
      logger.info('Signal below confidence threshold, skipping', {
        confidence: validatedSignal.confidence,
        threshold: config.confidenceThreshold,
      });
      await notifyLowConfidence(validatedSignal, config.confidenceThreshold);
      return;
    }

    const route = routeSignal(validatedSignal);

    const positionSide = getPositionSide(validatedSignal.action);
    if (!positionManager.canOpenPosition(route.symbol, positionSide)) {
      logger.warn('Position already exists, skipping', {
        symbol: route.symbol,
        side: positionSide,
      });
      await notifyError(
        new Error(`Position already exists for ${route.symbol} ${positionSide}`),
        'Trade Execution'
      );
      return;
    }

    if (config.simulationMode) {
      await executeSimulatedTrade(signal, validatedSignal, route);
      return;
    }

    let trade: Trade;

    if (route.exchange === Exchange.BINANCE) {
      if (!binance.isBinanceInitialized()) {
        throw new Error('Binance not initialized');
      }
      trade = await executeBinanceTrade(signal, validatedSignal, route);
    } else if (route.exchange === Exchange.IBKR) {
      if (!ibkr.isIBKRConnected()) {
        throw new Error('IBKR not connected');
      }
      trade = await executeIBKRTrade(signal, validatedSignal, route);
    } else {
      throw new Error(`Unsupported exchange: ${route.exchange}`);
    }

    logger.info('Trade executed successfully', {
      tradeId: trade.id,
      symbol: trade.symbol,
      exchange: trade.exchange,
    });

    await notifyTradeExecuted(trade);

  } catch (error) {
    const message = getErrorMessage(error);
    logger.error('Trade execution failed', { 
      signalId: signal.id, 
      error: message,
    });
    await notifyError(error instanceof Error ? error : new Error(message), 'Trade Execution');
    throw error;
  }
}

export function getExecutorConfig(): ExecutorConfig {
  return { ...config };
}
