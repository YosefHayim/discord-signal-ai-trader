import 'dotenv/config';
import { configSchema, type Config } from './schema.js';

function parseArrayEnv(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

function parseNumberEnv(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

function loadConfig(): Config {
  const rawConfig = {
    discord: {
      token: process.env.DISCORD_TOKEN || '',
      channelIds: parseArrayEnv(process.env.DISCORD_CHANNEL_IDS),
      userIds: parseArrayEnv(process.env.DISCORD_USER_IDS),
    },
    binance: {
      apiKey: process.env.BINANCE_API_KEY || '',
      apiSecret: process.env.BINANCE_API_SECRET || '',
      testnet: parseBooleanEnv(process.env.BINANCE_TESTNET, true),
    },
    ibkr: {
      host: process.env.IBKR_HOST || '127.0.0.1',
      port: parseNumberEnv(process.env.IBKR_PORT, 4002),
      clientId: parseNumberEnv(process.env.IBKR_CLIENT_ID, 0),
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
    },
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      chatId: process.env.TELEGRAM_CHAT_ID || '',
    },
    database: {
      url: process.env.DATABASE_URL || '',
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
    trading: {
      simulationMode: parseBooleanEnv(process.env.SIMULATION_MODE, true),
      confidenceThreshold: parseNumberEnv(process.env.CONFIDENCE_THRESHOLD, 0.7),
      defaultPositionSize: parseNumberEnv(process.env.DEFAULT_POSITION_SIZE, 100),
      defaultLeverage: parseNumberEnv(process.env.DEFAULT_LEVERAGE, 1),
    },
    server: {
      port: parseNumberEnv(process.env.PORT, 3000),
      nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    },
  };

  return configSchema.parse(rawConfig);
}

// Singleton configuration instance
let configInstance: Config | null = null;

export function getConfig(): Config {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

// For testing - allows resetting config
export function resetConfig(): void {
  configInstance = null;
}

export { type Config } from './schema.js';
export * from './constants.js';
