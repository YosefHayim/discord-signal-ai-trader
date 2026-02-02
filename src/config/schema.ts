import { z } from 'zod';

// Discord configuration
const discordSchema = z.object({
  token: z.string().min(1, 'DISCORD_TOKEN is required'),
  channelIds: z.array(z.string()).default([]),
  userIds: z.array(z.string()).default([]),
});

// Binance configuration
const binanceSchema = z.object({
  apiKey: z.string().default(''),
  apiSecret: z.string().default(''),
  testnet: z.boolean().default(true),
});

// Interactive Brokers configuration
const ibkrSchema = z.object({
  host: z.string().default('127.0.0.1'),
  port: z.number().default(4002), // Paper trading port
  clientId: z.number().default(0),
});

// Gemini AI configuration
const geminiSchema = z.object({
  apiKey: z.string().min(1, 'GEMINI_API_KEY is required'),
});

// Telegram configuration
const telegramSchema = z.object({
  botToken: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),
  chatId: z.string().min(1, 'TELEGRAM_CHAT_ID is required'),
});

const databaseSchema = z.object({
  url: z.string().min(1, 'DATABASE_URL is required'),
});

// Redis configuration
const redisSchema = z.object({
  url: z.string().default('redis://localhost:6379'),
});

// Trading configuration
const tradingSchema = z.object({
  simulationMode: z.boolean().default(true),
  confidenceThreshold: z.number().min(0).max(1).default(0.7),
  defaultPositionSize: z.number().positive().default(100),
  defaultLeverage: z.number().min(1).max(125).default(1),
});

// Server configuration
const serverSchema = z.object({
  port: z.number().default(3000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
});

// Complete configuration schema
export const configSchema = z.object({
  discord: discordSchema,
  binance: binanceSchema,
  ibkr: ibkrSchema,
  gemini: geminiSchema,
  telegram: telegramSchema,
  database: databaseSchema,
  redis: redisSchema,
  trading: tradingSchema,
  server: serverSchema,
});

export type Config = z.infer<typeof configSchema>;
