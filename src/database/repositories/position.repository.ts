import { PositionModel } from '../models/position.model.js';
import type { Position, PositionSide, PositionStatus, PositionUpdate } from '../../types/index.js';

export const positionRepository = {
  async create(position: Omit<Position, 'id' | 'updatedAt'>): Promise<Position> {
    const doc = await PositionModel.create(position);
    return doc.toJSON() as Position;
  },

  async findById(id: string): Promise<Position | null> {
    const doc = await PositionModel.findById(id);
    return doc ? (doc.toJSON() as Position) : null;
  },

  async findByTradeId(tradeId: string): Promise<Position | null> {
    const doc = await PositionModel.findOne({ tradeId });
    return doc ? (doc.toJSON() as Position) : null;
  },

  async findOpenPosition(symbol: string, side: PositionSide): Promise<Position | null> {
    const doc = await PositionModel.findOne({ 
      symbol, 
      side, 
      status: 'open' 
    });
    return doc ? (doc.toJSON() as Position) : null;
  },

  async hasOpenPosition(symbol: string, side: PositionSide): Promise<boolean> {
    const count = await PositionModel.countDocuments({ 
      symbol, 
      side, 
      status: 'open' 
    });
    return count > 0;
  },

  async update(id: string, updates: PositionUpdate): Promise<Position | null> {
    const doc = await PositionModel.findByIdAndUpdate(
      id,
      updates,
      { new: true }
    );
    return doc ? (doc.toJSON() as Position) : null;
  },

  async closePosition(id: string): Promise<Position | null> {
    const doc = await PositionModel.findByIdAndUpdate(
      id,
      { status: 'closed', closedAt: new Date() },
      { new: true }
    );
    return doc ? (doc.toJSON() as Position) : null;
  },

  async findAllOpen(): Promise<Position[]> {
    const docs = await PositionModel.find({ status: 'open' });
    return docs.map(doc => doc.toJSON() as Position);
  },
};
