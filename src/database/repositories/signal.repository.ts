import { SignalModel, type SignalDocument } from '../models/signal.model.js';
import type { Signal, SignalStatus, RawSignal, ParsedSignal } from '../../types/index.js';

export const signalRepository = {
  async create(rawSignal: RawSignal): Promise<Signal> {
    const doc = await SignalModel.create(rawSignal);
    return doc.toJSON() as Signal;
  },

  async findByHash(hash: string): Promise<Signal | null> {
    const doc = await SignalModel.findOne({ hash });
    return doc ? (doc.toJSON() as Signal) : null;
  },

  async findById(id: string): Promise<Signal | null> {
    const doc = await SignalModel.findById(id);
    return doc ? (doc.toJSON() as Signal) : null;
  },

  async updateStatus(
    id: string, 
    status: SignalStatus, 
    reason?: string
  ): Promise<Signal | null> {
    const doc = await SignalModel.findByIdAndUpdate(
      id,
      { 
        status, 
        statusReason: reason,
        processedAt: new Date(),
      },
      { new: true }
    );
    return doc ? (doc.toJSON() as Signal) : null;
  },

  async updateParsed(
    id: string, 
    parsed: ParsedSignal, 
    status: SignalStatus
  ): Promise<Signal | null> {
    const doc = await SignalModel.findByIdAndUpdate(
      id,
      { parsed, status, processedAt: new Date() },
      { new: true }
    );
    return doc ? (doc.toJSON() as Signal) : null;
  },

  async exists(hash: string): Promise<boolean> {
    const count = await SignalModel.countDocuments({ hash });
    return count > 0;
  },

  async findRecent(limit: number = 50): Promise<Signal[]> {
    const docs = await SignalModel.find()
      .sort({ receivedAt: -1 })
      .limit(limit);
    return docs.map(doc => doc.toJSON() as Signal);
  },
};
