import { z } from 'zod';

export const geminiSignalSchema = z.object({
  symbol: z.string(),
  action: z.enum(['LONG', 'SHORT']),
  entry: z.number().positive(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  leverage: z.number().min(1).max(125).optional(),
  confidence: z.number().min(0).max(1),
});

export type GeminiSignalResponse = z.infer<typeof geminiSignalSchema>;
