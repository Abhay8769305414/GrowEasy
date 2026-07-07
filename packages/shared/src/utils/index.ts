import { ConfidenceLevel, FieldConfidence } from '../types';
import { CONFIDENCE_THRESHOLDS } from '../constants';

/**
 * Normalize a phone number to a best-effort clean format.
 * Full E.164 normalization is done backend-side with libphonenumber.
 * This utility does basic cleaning for display.
 */
export function normalizePhoneDisplay(raw: string): string {
  return raw.replace(/[^\d+\-() ]/g, '').trim();
}

/**
 * Normalize an email address.
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Derive a ConfidenceLevel enum from a numeric score.
 */
export function scoreToLevel(score: number): ConfidenceLevel {
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) return ConfidenceLevel.HIGH;
  if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) return ConfidenceLevel.MEDIUM;
  return ConfidenceLevel.LOW;
}

/**
 * Build a FieldConfidence object from a raw score and reason string.
 */
export function buildFieldConfidence(score: number, reason: string): FieldConfidence {
  return {
    score,
    level: scoreToLevel(score),
    reason,
  };
}

/**
 * Truncate a string to a max length with ellipsis.
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

/**
 * Generate a unique request/correlation ID (browser-safe UUID v4).
 */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Format bytes to a human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format milliseconds to a human-readable duration string.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

/**
 * Estimate cost for Gemini 2.5 Flash tokens.
 * Pricing: $0.075 per 1M input tokens, $0.30 per 1M output tokens.
 */
export function estimateGeminiCost(promptTokens: number, completionTokens: number): number {
  const inputCost = (promptTokens / 1_000_000) * 0.075;
  const outputCost = (completionTokens / 1_000_000) * 0.30;
  return +(inputCost + outputCost).toFixed(6);
}
