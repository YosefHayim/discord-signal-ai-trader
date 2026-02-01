import { z } from 'zod';
import { Exchange, Market } from './exchange.js';

export const parsedSignalSchema = z.object({
  symbol: z.string().min(1).max(20).regex(/^[A-Z0-9/\-_]+$/i, 'Invalid symbol format'),
  action: z.enum(['LONG', 'SHORT']),
  entry: z.number().positive().finite(),
  stopLoss: z.number().positive().finite().optional(),
  takeProfit: z
    .union([z.number().positive().finite(), z.array(z.number().positive().finite())])
    .optional(),
  leverage: z.number().min(1).max(125).optional(),
  confidence: z.number().min(0).max(1),
  exchange: z.nativeEnum(Exchange).optional(),
  market: z.nativeEnum(Market).optional(),
});

export type ValidatedParsedSignal = z.infer<typeof parsedSignalSchema>;

export function validateParsedSignal(signal: unknown): ValidatedParsedSignal {
  return parsedSignalSchema.parse(signal);
}

export function isValidParsedSignal(signal: unknown): signal is ValidatedParsedSignal {
  return parsedSignalSchema.safeParse(signal).success;
}

export const tradeExecutionSchema = z.object({
  signalId: z.string().min(1),
  symbol: z.string().min(1).max(20),
  action: z.enum(['LONG', 'SHORT']),
  entry: z.number().positive().finite(),
  stopLoss: z.number().positive().finite().optional(),
  takeProfit: z.number().positive().finite().optional(),
  quantity: z.number().positive().finite(),
  leverage: z.number().min(1).max(125),
  exchange: z.nativeEnum(Exchange),
  market: z.nativeEnum(Market),
});

export type ValidatedTradeExecution = z.infer<typeof tradeExecutionSchema>;
