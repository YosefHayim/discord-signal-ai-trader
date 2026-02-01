import winston from 'winston';

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

// Custom format for development (pretty print)
const devFormat = printf(({ level, message, timestamp, module, ...metadata }) => {
  let msg = `${timestamp} [${level}]`;
  if (module) msg += ` [${module}]`;
  msg += `: ${message}`;
  
  // Add metadata if present
  const metaKeys = Object.keys(metadata);
  if (metaKeys.length > 0 && metaKeys[0] !== 'Symbol(splat)') {
    const filteredMeta = filterSensitiveData(metadata);
    msg += ` ${JSON.stringify(filteredMeta)}`;
  }
  
  return msg;
});

// Sensitive keys to redact
const SENSITIVE_KEYS = [
  'apiKey',
  'apiSecret',
  'token',
  'password',
  'secret',
  'authorization',
  'DISCORD_TOKEN',
  'BINANCE_API_KEY',
  'BINANCE_API_SECRET',
  'GEMINI_API_KEY',
  'TELEGRAM_BOT_TOKEN',
];

// Filter sensitive data from logs
function filterSensitiveData(obj: Record<string, unknown>): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
      filtered[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      filtered[key] = filterSensitiveData(value as Record<string, unknown>);
    } else {
      filtered[key] = value;
    }
  }
  
  return filtered;
}

// Determine log level from environment
const getLogLevel = (): string => {
  const level = process.env.LOG_LEVEL?.toLowerCase();
  if (level && ['error', 'warn', 'info', 'debug'].includes(level)) {
    return level;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
};

// Create base logger
const baseLogger = winston.createLogger({
  level: getLogLevel(),
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  ),
  defaultMeta: { service: 'signal-trader' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        devFormat,
      ),
    }),
  ],
});

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
  baseLogger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: combine(json()),
    })
  );
  baseLogger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: combine(json()),
    })
  );
}

// Logger interface for module-specific logging
export interface Logger {
  error(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

// Create a child logger for a specific module
export function createLogger(module: string): Logger {
  return {
    error: (message: string, meta?: Record<string, unknown>) => 
      baseLogger.error(message, { module, ...meta }),
    warn: (message: string, meta?: Record<string, unknown>) => 
      baseLogger.warn(message, { module, ...meta }),
    info: (message: string, meta?: Record<string, unknown>) => 
      baseLogger.info(message, { module, ...meta }),
    debug: (message: string, meta?: Record<string, unknown>) => 
      baseLogger.debug(message, { module, ...meta }),
  };
}

// Default logger instance
export const logger = createLogger('main');

// Export base logger for advanced usage
export { baseLogger };
