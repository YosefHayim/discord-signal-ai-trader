import { createHash } from 'crypto';

/**
 * Generate a SHA256 hash for signal deduplication
 * Combines content, images, and message metadata to create unique hash
 */
export function hashSignal(content: string, messageId?: string): string {
  const data = `${content}:${messageId || ''}`;
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a short hash (first 16 chars) for display purposes
 */
export function shortHash(content: string): string {
  return hashSignal(content).substring(0, 16);
}
