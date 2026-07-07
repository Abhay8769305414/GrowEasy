import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config';
import { logger } from '../logger';

// Check if a real key has been provided (not the default placeholder)
const isApiKeyPlaceholder = 
  !config.geminiApiKey || 
  config.geminiApiKey === 'your_gemini_api_key_here' || 
  config.geminiApiKey.includes('placeholder') ||
  config.geminiApiKey.trim() === '';

let genAI: GoogleGenerativeAI | null = null;

if (!isApiKeyPlaceholder) {
  try {
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
    logger.info('[GeminiClient] Initialized GoogleGenerativeAI client successfully.');
  } catch (err) {
    logger.error({ err }, '[GeminiClient] Failed to initialize GoogleGenerativeAI client.');
  }
} else {
  logger.warn('[GeminiClient] GEMINI_API_KEY is unset or placeholder. All AI Agent requests will automatically use deterministic fallback matching.');
}

/**
 * Checks if the Gemini API client is available and active.
 */
export function isGeminiActive(): boolean {
  return genAI !== null;
}

/**
 * Helper to call Gemini model with structured output config or custom fallback.
 */
export async function generateStructuredJson<T>(
  prompt: string,
  systemInstruction?: string,
  schema?: any
): Promise<T | null> {
  if (!genAI) {
    logger.debug('[GeminiClient] No active Gemini client — bypassing call.');
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: config.geminiModel,
      systemInstruction: systemInstruction,
    });

    const generationConfig: any = {
      responseMimeType: 'application/json',
    };

    if (schema) {
      generationConfig.responseSchema = schema;
    }

    logger.debug({ model: config.geminiModel }, '[GeminiClient] Sending generateContent request...');
    const startTime = Date.now();
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    });
    
    const latency = Date.now() - startTime;
    const responseText = result.response.text();
    
    logger.debug({ latencyMs: latency }, '[GeminiClient] Received response from model.');
    
    return JSON.parse(responseText) as T;
  } catch (error) {
    logger.error(
      { err: (error as Error).message },
      '[GeminiClient] Error generating structured content from Gemini'
    );
    return null;
  }
}
