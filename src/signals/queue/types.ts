import type { RawSignal } from '../../types/index.js';

export const SIGNAL_QUEUE_NAME = 'trading-signals';

export interface SignalJobData {
  rawSignal: RawSignal;
}

export interface SignalJobResult {
  success: boolean;
  signalId?: string;
  error?: string;
  executed?: boolean;
}

export type SignalJobName = 'process-signal';
