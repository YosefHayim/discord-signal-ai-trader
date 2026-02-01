export {
  createTelegramBot,
  getTelegramBot,
  startTelegramBot,
  stopTelegramBot,
  getIsPaused,
  type TelegramBotOptions,
} from './bot.js';

export { handleStart } from './commands/start.js';
export { handleStatus, setStatusCallback, type BotStatus } from './commands/status.js';
export { handlePositions, setPositionsCallback } from './commands/positions.js';
export { handleStop, handleResume, setStopCallback, setResumeCallback } from './commands/stop.js';

export {
  initializeNotifications,
  notifySignalReceived,
  notifyTradeExecuted,
  notifyTradeClosed,
  notifyLowConfidence,
  notifySimulatedTrade,
} from './notifications/trade.notification.js';

export {
  initializeErrorNotifications,
  notifyError,
  notifyConnectionError,
  notifyTradeError,
} from './notifications/error.notification.js';
