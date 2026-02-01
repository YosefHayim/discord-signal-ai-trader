import mongoose, { Schema, Document } from 'mongoose';
import { Exchange, Market, PositionSide, PositionStatus, type Position } from '../../types/index.js';

export interface PositionDocument extends Omit<Position, 'id'>, Document {}

const PositionSchema = new Schema<PositionDocument>({
  tradeId: { type: String, required: true, index: true },
  exchange: { type: String, enum: Object.values(Exchange), required: true },
  market: { type: String, enum: Object.values(Market), required: true },
  symbol: { type: String, required: true, index: true },
  side: { type: String, enum: Object.values(PositionSide), required: true },
  quantity: { type: Number, required: true },
  entryPrice: { type: Number, required: true },
  currentPrice: { type: Number },
  stopLoss: { type: Number },
  takeProfit: { type: Number },
  leverage: { type: Number, required: true, default: 1 },
  unrealizedPnl: { type: Number },
  unrealizedPnlPercentage: { type: Number },
  status: { 
    type: String, 
    enum: Object.values(PositionStatus), 
    required: true,
    default: PositionStatus.OPEN,
    index: true,
  },
  openedAt: { type: Date, required: true, default: Date.now },
  closedAt: { type: Date },
}, {
  timestamps: { createdAt: false, updatedAt: true },
  toJSON: {
    virtuals: true,
    transform: (_, ret) => {
      ret.id = ret._id.toString();
      delete (ret as any)._id;
      delete (ret as any).__v;
      return ret;
    },
  },
});

// Enforce one open position per symbol per side
PositionSchema.index(
  { symbol: 1, side: 1, status: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: PositionStatus.OPEN }
  }
);

export const PositionModel = mongoose.model<PositionDocument>('Position', PositionSchema);
