import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import type { Redis } from 'ioredis';
import { createLogger } from '../../utils/logger.js';
import { 
  SIGNAL_QUEUE_NAME, 
  type SignalJobData, 
  type SignalJobResult,
  type SignalJobName,
} from './types.js';

const logger = createLogger('signal-queue');

let signalQueue: Queue<SignalJobData, SignalJobResult, SignalJobName> | null = null;
let signalWorker: Worker<SignalJobData, SignalJobResult, SignalJobName> | null = null;
let queueEvents: QueueEvents | null = null;

export function createSignalQueue(connection: Redis): Queue<SignalJobData, SignalJobResult, SignalJobName> {
  if (signalQueue) {
    return signalQueue;
  }

  logger.info('Creating signal queue');

  signalQueue = new Queue<SignalJobData, SignalJobResult, SignalJobName>(SIGNAL_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: {
        count: 1000,
        age: 24 * 60 * 60,
      },
      removeOnFail: {
        count: 500,
      },
    },
  });

  return signalQueue;
}

export function getSignalQueue(): Queue<SignalJobData, SignalJobResult, SignalJobName> | null {
  return signalQueue;
}

export type SignalProcessor = (job: Job<SignalJobData, SignalJobResult, SignalJobName>) => Promise<SignalJobResult>;

export function createSignalWorker(
  connection: Redis,
  processor: SignalProcessor
): Worker<SignalJobData, SignalJobResult, SignalJobName> {
  if (signalWorker) {
    logger.warn('Worker already exists, returning existing worker');
    return signalWorker;
  }

  logger.info('Creating signal worker');

  signalWorker = new Worker<SignalJobData, SignalJobResult, SignalJobName>(
    SIGNAL_QUEUE_NAME,
    processor,
    {
      connection,
      concurrency: 1,
      limiter: {
        max: 10,
        duration: 10000,
      },
    }
  );

  signalWorker.on('completed', (job, result) => {
    logger.info('Job completed', { 
      jobId: job.id, 
      signalId: result.signalId,
      executed: result.executed,
    });
  });

  signalWorker.on('failed', (job, err) => {
    logger.error('Job failed', { 
      jobId: job?.id, 
      error: err.message,
      attempts: job?.attemptsMade,
    });
  });

  signalWorker.on('error', (err) => {
    logger.error('Worker error', { error: err.message });
  });

  return signalWorker;
}

export function getSignalWorker(): Worker<SignalJobData, SignalJobResult, SignalJobName> | null {
  return signalWorker;
}

export function createQueueEvents(connection: Redis): QueueEvents {
  if (queueEvents) {
    return queueEvents;
  }

  queueEvents = new QueueEvents(SIGNAL_QUEUE_NAME, { connection });

  queueEvents.on('waiting', ({ jobId }) => {
    logger.debug('Job waiting', { jobId });
  });

  queueEvents.on('active', ({ jobId }) => {
    logger.debug('Job active', { jobId });
  });

  return queueEvents;
}

export async function addSignalToQueue(rawSignal: SignalJobData['rawSignal']): Promise<Job<SignalJobData, SignalJobResult, SignalJobName>> {
  if (!signalQueue) {
    throw new Error('Signal queue not initialized');
  }

  const job = await signalQueue.add('process-signal', { rawSignal }, {
    jobId: rawSignal.hash,
  });

  logger.info('Signal added to queue', { 
    jobId: job.id, 
    hash: rawSignal.hash,
  });

  return job;
}

export async function closeSignalQueue(): Promise<void> {
  logger.info('Closing signal queue components');

  if (signalWorker) {
    await signalWorker.close();
    signalWorker = null;
  }

  if (queueEvents) {
    await queueEvents.close();
    queueEvents = null;
  }

  if (signalQueue) {
    await signalQueue.close();
    signalQueue = null;
  }
}

export async function getQueueStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}> {
  if (!signalQueue) {
    return { waiting: 0, active: 0, completed: 0, failed: 0 };
  }

  const [waiting, active, completed, failed] = await Promise.all([
    signalQueue.getWaitingCount(),
    signalQueue.getActiveCount(),
    signalQueue.getCompletedCount(),
    signalQueue.getFailedCount(),
  ]);

  return { waiting, active, completed, failed };
}
