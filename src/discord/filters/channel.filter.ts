import { createLogger } from '../../utils/logger.js';

const logger = createLogger('channel-filter');

let allowedChannels: Set<string> = new Set();

export function setAllowedChannels(channelIds: string[]): void {
  allowedChannels = new Set(channelIds);
  logger.info('Allowed channels updated', { count: allowedChannels.size });
}

export function isChannelAllowed(channelId: string): boolean {
  // If no channels configured, allow all
  if (allowedChannels.size === 0) return true;
  return allowedChannels.has(channelId);
}

export function getAllowedChannels(): string[] {
  return Array.from(allowedChannels);
}
