import { TradeModel } from '../models/trade.model.js';
import type { Trade, TradeStatus, OrderInfo } from '../../types/index.js';

export const tradeRepository = {
  async create(trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>): Promise<Trade> {
    const doc = await TradeModel.create(trade);
    return doc.toJSON() as Trade;
  },

  async findById(id: string): Promise<Trade | null> {
    const doc = await TradeModel.findById(id);
    return doc ? (doc.toJSON() as Trade) : null;
  },

  async findBySignalId(signalId: string): Promise<Trade | null> {
    const doc = await TradeModel.findOne({ signalId });
    return doc ? (doc.toJSON() as Trade) : null;
  },

  async updateStatus(id: string, status: TradeStatus): Promise<Trade | null> {
    const doc = await TradeModel.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    return doc ? (doc.toJSON() as Trade) : null;
  },

  async addOrder(id: string, order: OrderInfo): Promise<Trade | null> {
    const doc = await TradeModel.findByIdAndUpdate(
      id,
      { $push: { orders: order } },
      { new: true }
    );
    return doc ? (doc.toJSON() as Trade) : null;
  },

  async closeTrade(
    id: string, 
    pnl: number, 
    pnlPercentage: number, 
    reason: string
  ): Promise<Trade | null> {
    const doc = await TradeModel.findByIdAndUpdate(
      id,
      { 
        status: 'closed',
        pnl,
        pnlPercentage,
        closedAt: new Date(),
        closeReason: reason,
      },
      { new: true }
    );
    return doc ? (doc.toJSON() as Trade) : null;
  },

  async findOpenTrades(): Promise<Trade[]> {
    const docs = await TradeModel.find({ 
      status: { $in: ['pending', 'open', 'partially_filled'] }
    });
    return docs.map(doc => doc.toJSON() as Trade);
  },
};
