import { createLogger } from '../../utils/logger.js';

const logger = createLogger('user-filter');

let allowedUsers: Set<string> = new Set();

export function setAllowedUsers(userIds: string[]): void {
  allowedUsers = new Set(userIds);
  logger.info('Allowed users updated', { count: allowedUsers.size });
}

export function isUserAllowed(userId: string): boolean {
  // If no users configured, allow all
  if (allowedUsers.size === 0) return true;
  return allowedUsers.has(userId);
}

export function getAllowedUsers(): string[] {
  return Array.from(allowedUsers);
}
