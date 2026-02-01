import { GoogleGenerativeAI } from '@google/generative-ai';
import { createLogger } from '../utils/logger.js';
import { retry, isRateLimitError } from '../utils/retry.js';
import { SIGNAL_EXTRACTION_PROMPT, SIGNAL_EXTRACTION_SYSTEM } from './prompts/signal-extraction.js';
import { geminiSignalSchema, type GeminiSignalResponse } from './schemas/signal.schema.js';
import type { ParsedSignal } from '../types/index.js';

const logger = createLogger('gemini');

let geminiClient: GoogleGenerativeAI | null = null;

export function initializeGemini(apiKey: string): void {
  if (geminiClient) {
    logger.warn('Gemini client already initialized');
    return;
  }

  logger.info('Initializing Gemini AI client');
  geminiClient = new GoogleGenerativeAI(apiKey);
}

export function getGeminiClient(): GoogleGenerativeAI | null {
  return geminiClient;
}

export async function extractSignalFromImage(
  imageBase64: string,
  mimeType: string = 'image/png'
): Promise<ParsedSignal | null> {
  if (!geminiClient) {
    throw new Error('Gemini client not initialized. Call initializeGemini first.');
  }

  logger.info('Extracting signal from image', { mimeType, imageSize: imageBase64.length });

  try {
    const model = geminiClient.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await retry(
      async () => {
        const response = await model.generateContent([
          SIGNAL_EXTRACTION_PROMPT,
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
        ]);

        return response;
      },
      {
        maxAttempts: 3,
        initialDelayMs: 2000,
        retryableErrors: isRateLimitError,
        onRetry: (error, attempt) => {
          logger.warn('Gemini API retry', { attempt, error: error.message });
        },
      }
    );

    // Extract text from response
    const text = result.response.text();
    if (!text) {
      logger.warn('Empty response from Gemini');
      return null;
    }

    logger.debug('Gemini raw response', { text: text.substring(0, 200) });

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn('No JSON found in Gemini response');
      return null;
    }

    const jsonStr = jsonMatch[0];
    let parsed: unknown;
    
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      logger.error('Failed to parse Gemini JSON response', { json: jsonStr });
      return null;
    }

    // Validate with Zod schema
    const validated = geminiSignalSchema.safeParse(parsed);
    if (!validated.success) {
      logger.warn('Gemini response validation failed', { 
        errors: validated.error.errors 
      });
      return null;
    }

    const data = validated.data;

    // Convert to ParsedSignal
    const signal: ParsedSignal = {
      symbol: data.symbol.toUpperCase().replace(/\/USDT?$/, ''),
      action: data.action,
      entry: data.entry,
      stopLoss: data.stopLoss,
      takeProfit: data.takeProfit,
      leverage: data.leverage,
      confidence: data.confidence,
    };

    logger.info('Signal extracted from image', {
      symbol: signal.symbol,
      action: signal.action,
      entry: signal.entry,
      confidence: signal.confidence,
    });

    return signal;

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error extracting signal from image', { error: message });
    return null;
  }
}

export function closeGemini(): void {
  geminiClient = null;
  logger.info('Gemini client closed');
}
