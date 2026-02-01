import { createLogger } from './logger.js';
import { sleep } from './sleep.js';

const logger = createLogger('retry');

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: (error: Error) => boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'retryableErrors' | 'onRetry'>> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Execute a function with exponential backoff retry
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  let delay = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if error is retryable
      if (opts.retryableErrors && !opts.retryableErrors(lastError)) {
        throw lastError;
      }
      
      // Last attempt - throw error
      if (attempt === opts.maxAttempts) {
        logger.error(`All ${opts.maxAttempts} attempts failed`, {
          error: lastError.message,
        });
        throw lastError;
      }
      
      // Log retry attempt
      logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`, {
        error: lastError.message,
        nextAttempt: attempt + 1,
      });
      
      // Call onRetry callback if provided
      opts.onRetry?.(lastError, attempt);
      
      // Wait before retrying
      await sleep(delay);
      
      // Increase delay with backoff
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Retry failed');
}

/**
 * Check if error is a rate limit error (status 429)
 */
export function isRateLimitError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('too many requests')
  );
}
