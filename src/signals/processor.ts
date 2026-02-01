import { Job } from 'bullmq';
import { createLogger } from '../utils/logger.js';
import { 
  createSignalWorker, 
  type SignalJobData, 
  type SignalJobResult,
  type SignalProcessor,
} from './queue/index.js';
import { parseTextSignal } from './parsers/text.parser.js';
import { extractSignalFromImage } from '../ai/gemini.client.js';
import { signalRepository } from '../database/index.js';
import { SignalStatus, SignalSource, type ParsedSignal, type Signal } from '../types/index.js';
import type { Redis } from 'ioredis';

const logger = createLogger('signal-processor');

type ExecuteCallback = (signal: Signal, parsed: ParsedSignal) => Promise<void>;
let executeCallback: ExecuteCallback | null = null;
let confidenceThreshold = 0.7;
let isPaused = false;

export function setExecuteCallback(callback: ExecuteCallback): void {
  executeCallback = callback;
}

export function setConfidenceThreshold(threshold: number): void {
  confidenceThreshold = Math.max(0, Math.min(1, threshold));
  logger.info('Confidence threshold set', { threshold: confidenceThreshold });
}

export function pauseProcessing(): void {
  isPaused = true;
  logger.warn('Signal processing paused');
}

export function resumeProcessing(): void {
  isPaused = false;
  logger.info('Signal processing resumed');
}

export function isProcessingPaused(): boolean {
  return isPaused;
}

function mergeSignalResults(
  imageParsed: ParsedSignal | null,
  textParsed: ParsedSignal | null
): ParsedSignal | null {
  if (!imageParsed && !textParsed) {
    return null;
  }

  if (!imageParsed) {
    return textParsed;
  }

  if (!textParsed) {
    return imageParsed;
  }

  const merged: ParsedSignal = {
    symbol: imageParsed.symbol || textParsed.symbol,
    action: imageParsed.action || textParsed.action,
    entry: imageParsed.entry || textParsed.entry,
    stopLoss: imageParsed.stopLoss ?? textParsed.stopLoss,
    takeProfit: imageParsed.takeProfit ?? textParsed.takeProfit,
    leverage: imageParsed.leverage ?? textParsed.leverage,
    confidence: Math.max(imageParsed.confidence, textParsed.confidence),
    exchange: imageParsed.exchange ?? textParsed.exchange,
    market: imageParsed.market ?? textParsed.market,
  };

  logger.debug('Merged signal results', {
    imageSymbol: imageParsed.symbol,
    textSymbol: textParsed.symbol,
    mergedSymbol: merged.symbol,
    imageConfidence: imageParsed.confidence,
    textConfidence: textParsed.confidence,
    mergedConfidence: merged.confidence,
  });

  return merged;
}

const processSignal: SignalProcessor = async (
  job: Job<SignalJobData, SignalJobResult>
): Promise<SignalJobResult> => {
  const { rawSignal } = job.data;
  
  logger.info('Processing signal', { 
    jobId: job.id, 
    hash: rawSignal.hash,
    source: rawSignal.source,
  });

  if (isPaused) {
    logger.warn('Processing paused, skipping signal', { hash: rawSignal.hash });
    return { success: false, error: 'Processing paused' };
  }

  try {
    const existing = await signalRepository.findByHash(rawSignal.hash);
    if (existing) {
      logger.debug('Duplicate signal found', { hash: rawSignal.hash });
      return { success: true, signalId: existing.id, executed: false };
    }

    const savedSignal = await signalRepository.create(rawSignal);
    logger.debug('Signal saved to database', { id: savedSignal.id });

    const hasImage = rawSignal.imageBase64 && rawSignal.imageBase64.length > 0;
    const hasText = rawSignal.rawContent && rawSignal.rawContent.trim().length > 0;

    let imageParsed: ParsedSignal | null = null;
    let textParsed: ParsedSignal | null = null;

    if (hasImage) {
      logger.debug('Parsing image signal with Gemini');
      try {
        imageParsed = await extractSignalFromImage(
          rawSignal.imageBase64!,
          rawSignal.imageMimeType || 'image/png'
        );
      } catch (err) {
        logger.error('Failed to parse image', { error: err instanceof Error ? err.message : 'Unknown' });
      }
    }

    if (hasText) {
      logger.debug('Parsing text signal');
      textParsed = parseTextSignal(rawSignal.rawContent);
    }

    const parsed = mergeSignalResults(imageParsed, textParsed);

    if (!parsed) {
      logger.warn('Failed to parse signal from both image and text', { hash: rawSignal.hash });
      await signalRepository.updateStatus(
        savedSignal.id,
        SignalStatus.FAILED,
        'Failed to parse signal content'
      );
      return { success: false, signalId: savedSignal.id, error: 'Parse failed' };
    }

    logger.debug('Signal parsing sources', {
      hasImage,
      hasText,
      imageParseSuccess: !!imageParsed,
      textParseSuccess: !!textParsed,
    });

    const updatedSignal = await signalRepository.updateParsed(
      savedSignal.id,
      parsed,
      SignalStatus.PARSED
    );

    if (!updatedSignal) {
      return { success: false, signalId: savedSignal.id, error: 'Failed to update signal' };
    }

    logger.info('Signal parsed successfully', {
      id: savedSignal.id,
      symbol: parsed.symbol,
      action: parsed.action,
      confidence: parsed.confidence,
    });

    if (parsed.confidence < confidenceThreshold) {
      logger.info('Signal below confidence threshold', {
        confidence: parsed.confidence,
        threshold: confidenceThreshold,
      });
      await signalRepository.updateStatus(
        savedSignal.id,
        SignalStatus.SKIPPED,
        `Confidence ${(parsed.confidence * 100).toFixed(0)}% below threshold ${(confidenceThreshold * 100).toFixed(0)}%`
      );
      return { success: true, signalId: savedSignal.id, executed: false };
    }

    if (executeCallback) {
      try {
        await executeCallback(updatedSignal, parsed);
        await signalRepository.updateStatus(savedSignal.id, SignalStatus.EXECUTED);
        logger.info('Signal executed', { id: savedSignal.id });
        return { success: true, signalId: savedSignal.id, executed: true };
      } catch (execError) {
        const errorMsg = execError instanceof Error ? execError.message : 'Unknown error';
        logger.error('Error executing signal', { error: errorMsg });
        await signalRepository.updateStatus(
          savedSignal.id,
          SignalStatus.FAILED,
          `Execution failed: ${errorMsg}`
        );
        return { success: false, signalId: savedSignal.id, error: errorMsg };
      }
    }

    logger.warn('No execute callback set, signal not executed');
    return { success: true, signalId: savedSignal.id, executed: false };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error processing signal', { error: errorMsg, hash: rawSignal.hash });
    return { success: false, error: errorMsg };
  }
};

let workerInstance: ReturnType<typeof createSignalWorker> | null = null;

export function startSignalProcessor(redisConnection: Redis): void {
  if (workerInstance) {
    logger.warn('Signal processor already started');
    return;
  }

  logger.info('Starting signal processor');
  workerInstance = createSignalWorker(redisConnection, processSignal);
}

export function getSignalProcessor() {
  return workerInstance;
}

export async function stopSignalProcessor(): Promise<void> {
  if (workerInstance) {
    logger.info('Stopping signal processor');
    await workerInstance.close();
    workerInstance = null;
  }
}
