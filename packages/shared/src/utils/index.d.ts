import { ConfidenceLevel, FieldConfidence } from '../types';
/**
 * Normalize a phone number to a best-effort clean format.
 * Full E.164 normalization is done backend-side with libphonenumber.
 * This utility does basic cleaning for display.
 */
export declare function normalizePhoneDisplay(raw: string): string;
/**
 * Normalize an email address.
 */
export declare function normalizeEmail(raw: string): string;
/**
 * Derive a ConfidenceLevel enum from a numeric score.
 */
export declare function scoreToLevel(score: number): ConfidenceLevel;
/**
 * Build a FieldConfidence object from a raw score and reason string.
 */
export declare function buildFieldConfidence(score: number, reason: string): FieldConfidence;
/**
 * Truncate a string to a max length with ellipsis.
 */
export declare function truncate(str: string, maxLen: number): string;
/**
 * Generate a unique request/correlation ID (browser-safe UUID v4).
 */
export declare function generateId(): string;
/**
 * Format bytes to a human-readable string.
 */
export declare function formatBytes(bytes: number): string;
/**
 * Format milliseconds to a human-readable duration string.
 */
export declare function formatDuration(ms: number): string;
/**
 * Estimate cost for Gemini 2.5 Flash tokens.
 * Pricing: $0.075 per 1M input tokens, $0.30 per 1M output tokens.
 */
export declare function estimateGeminiCost(promptTokens: number, completionTokens: number): number;
//# sourceMappingURL=index.d.ts.map