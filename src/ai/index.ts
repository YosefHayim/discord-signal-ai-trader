export { 
  initializeGemini, 
  getGeminiClient, 
  extractSignalFromImage,
  closeGemini,
} from './gemini.client.js';

export { SIGNAL_EXTRACTION_PROMPT, SIGNAL_EXTRACTION_SYSTEM } from './prompts/signal-extraction.js';
export { geminiSignalSchema, type GeminiSignalResponse } from './schemas/signal.schema.js';
