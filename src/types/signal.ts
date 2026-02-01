import type { Exchange, Market } from './exchange.js';

export enum SignalSource {
  DISCORD_TEXT = 'discord_text',
  DISCORD_IMAGE = 'discord_image',
  WEBHOOK = 'webhook',
}

export enum SignalStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PARSED = 'parsed',
  EXECUTED = 'executed',
  SKIPPED = 'skipped',
  FAILED = 'failed',
}

export type SignalAction = 'LONG' | 'SHORT';

export interface RawSignal {
  id: string;
  source: SignalSource;
  rawContent: string;
  imageBase64?: string;
  imageMimeType?: string;
  channelId: string;
  userId: string;
  messageId: string;
  hash: string;
  receivedAt: Date;
}

export interface ParsedSignal {
  symbol: string;
  action: SignalAction;
  entry: number;
  stopLoss?: number;
  takeProfit?: number | number[];
  leverage?: number;
  confidence: number;
  exchange?: Exchange;
  market?: Market;
}

export interface Signal extends RawSignal {
  parsed?: ParsedSignal;
  status: SignalStatus;
  statusReason?: string;
  processedAt?: Date;
}

export interface SignalQueueJob {
  rawSignal: RawSignal;
}
