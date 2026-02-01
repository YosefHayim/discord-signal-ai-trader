import mongoose, { Schema, Document } from 'mongoose';
import { SignalSource, SignalStatus, type Signal, type ParsedSignal } from '../../types/index.js';

export interface SignalDocument extends Omit<Signal, 'id'>, Document {}

const ParsedSignalSchema = new Schema<ParsedSignal>({
  symbol: { type: String, required: true },
  action: { type: String, enum: ['LONG', 'SHORT'], required: true },
  entry: { type: Number, required: true },
  stopLoss: { type: Number },
  takeProfit: { type: Schema.Types.Mixed }, // number or number[]
  leverage: { type: Number },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  exchange: { type: String },
  market: { type: String },
}, { _id: false });

const SignalSchema = new Schema<SignalDocument>({
  source: { 
    type: String, 
    enum: Object.values(SignalSource), 
    required: true 
  },
  rawContent: { type: String, required: true },
  imageBase64: { type: String },
  imageMimeType: { type: String },
  channelId: { type: String, required: true },
  userId: { type: String, required: true },
  messageId: { type: String, required: true },
  hash: { type: String, required: true, unique: true, index: true },
  receivedAt: { type: Date, required: true, default: Date.now },
  parsed: { type: ParsedSignalSchema },
  status: { 
    type: String, 
    enum: Object.values(SignalStatus), 
    required: true,
    default: SignalStatus.PENDING,
    index: true,
  },
  statusReason: { type: String },
  processedAt: { type: Date },
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

// Index for deduplication lookup
SignalSchema.index({ hash: 1 }, { unique: true });

// Index for status queries
SignalSchema.index({ status: 1, receivedAt: -1 });

export const SignalModel = mongoose.model<SignalDocument>('Signal', SignalSchema);
