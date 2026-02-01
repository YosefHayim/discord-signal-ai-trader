import mongoose, { Schema, Document } from 'mongoose';
import { Exchange, Market, TradeStatus, OrderSide, OrderType, type Trade, type OrderInfo } from '../../types/index.js';

export interface TradeDocument extends Omit<Trade, 'id'>, Document {}

const OrderInfoSchema = new Schema<OrderInfo>({
  orderId: { type: String, required: true },
  type: { type: String, enum: Object.values(OrderType), required: true },
  side: { type: String, enum: Object.values(OrderSide), required: true },
  price: { type: Number },
  quantity: { type: Number, required: true },
  status: { type: String, required: true },
  filledQuantity: { type: Number },
  avgPrice: { type: Number },
  createdAt: { type: Date, required: true },
  updatedAt: { type: Date },
}, { _id: false });

const TradeSchema = new Schema<TradeDocument>({
  signalId: { type: String, required: true, index: true },
  exchange: { type: String, enum: Object.values(Exchange), required: true },
  market: { type: String, enum: Object.values(Market), required: true },
  symbol: { type: String, required: true, index: true },
  side: { type: String, enum: Object.values(OrderSide), required: true },
  quantity: { type: Number, required: true },
  entryPrice: { type: Number, required: true },
  stopLoss: { type: Number },
  takeProfit: { type: Number },
  leverage: { type: Number, required: true, default: 1 },
  status: { 
    type: String, 
    enum: Object.values(TradeStatus), 
    required: true,
    default: TradeStatus.PENDING,
    index: true,
  },
  orders: [OrderInfoSchema],
  pnl: { type: Number },
  pnlPercentage: { type: Number },
  closedAt: { type: Date },
  closeReason: { type: String },
}, {
  timestamps: true,
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

// Index for querying open trades
TradeSchema.index({ status: 1, symbol: 1 });

export const TradeModel = mongoose.model<TradeDocument>('Trade', TradeSchema);
