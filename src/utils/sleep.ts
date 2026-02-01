/**
 * Promise-based sleep/delay function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sleep with random jitter to prevent thundering herd
 */
export function sleepWithJitter(baseMs: number, jitterPercent: number = 0.2): Promise<void> {
  const jitter = baseMs * jitterPercent * (Math.random() - 0.5) * 2;
  const actualMs = Math.max(0, baseMs + jitter);
  return sleep(actualMs);
}
