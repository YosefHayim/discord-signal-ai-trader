import { createLogger } from './logger.js';

const logger = createLogger('shutdown');

type ShutdownHandler = () => Promise<void>;

const shutdownHandlers: Array<{ name: string; handler: ShutdownHandler }> = [];
let isShuttingDown = false;
const SHUTDOWN_TIMEOUT_MS = 30000;

export function registerShutdownHandler(name: string, handler: ShutdownHandler): void {
  shutdownHandlers.push({ name, handler });
  logger.debug('Shutdown handler registered', { name, total: shutdownHandlers.length });
}

export function unregisterShutdownHandler(name: string): void {
  const index = shutdownHandlers.findIndex(h => h.name === name);
  if (index !== -1) {
    shutdownHandlers.splice(index, 1);
    logger.debug('Shutdown handler unregistered', { name });
  }
}

async function runShutdownHandlers(): Promise<void> {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress');
    return;
  }
  
  isShuttingDown = true;
  logger.info('Starting graceful shutdown...', { handlers: shutdownHandlers.length });

  const timeout = setTimeout(() => {
    logger.error('Shutdown timeout exceeded, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  for (const { name, handler } of shutdownHandlers.reverse()) {
    try {
      logger.debug('Running shutdown handler', { name });
      await handler();
      logger.debug('Shutdown handler completed', { name });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Shutdown handler failed', { name, error: msg });
    }
  }

  clearTimeout(timeout);
  logger.info('Graceful shutdown complete');
}

export function setupShutdownHooks(): void {
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];
  
  for (const signal of signals) {
    process.on(signal, async () => {
      logger.info('Received signal', { signal });
      await runShutdownHandlers();
      process.exit(0);
    });
  }

  process.on('uncaughtException', async (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    await runShutdownHandlers();
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    logger.error('Unhandled rejection', { reason: message });
    await runShutdownHandlers();
    process.exit(1);
  });

  logger.info('Shutdown hooks registered');
}

export function isShutdownInProgress(): boolean {
  return isShuttingDown;
}

export async function triggerShutdown(): Promise<void> {
  await runShutdownHandlers();
}
