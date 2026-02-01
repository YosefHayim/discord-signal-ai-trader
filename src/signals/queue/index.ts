export { 
  createRedisConnection, 
  getRedisConnection, 
  closeRedisConnection 
} from './connection.js';

export {
  createSignalQueue,
  getSignalQueue,
  createSignalWorker,
  getSignalWorker,
  createQueueEvents,
  addSignalToQueue,
  closeSignalQueue,
  getQueueStats,
  type SignalProcessor,
} from './signal-queue.js';

export {
  SIGNAL_QUEUE_NAME,
  type SignalJobData,
  type SignalJobResult,
  type SignalJobName,
} from './types.js';
