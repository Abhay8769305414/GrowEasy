"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePhoneDisplay = normalizePhoneDisplay;
exports.normalizeEmail = normalizeEmail;
exports.scoreToLevel = scoreToLevel;
exports.buildFieldConfidence = buildFieldConfidence;
exports.truncate = truncate;
exports.generateId = generateId;
exports.formatBytes = formatBytes;
exports.formatDuration = formatDuration;
exports.estimateGeminiCost = estimateGeminiCost;
const types_1 = require("../types");
const constants_1 = require("../constants");
/**
 * Normalize a phone number to a best-effort clean format.
 * Full E.164 normalization is done backend-side with libphonenumber.
 * This utility does basic cleaning for display.
 */
function normalizePhoneDisplay(raw) {
    return raw.replace(/[^\d+\-() ]/g, '').trim();
}
/**
 * Normalize an email address.
 */
function normalizeEmail(raw) {
    return raw.trim().toLowerCase();
}
/**
 * Derive a ConfidenceLevel enum from a numeric score.
 */
function scoreToLevel(score) {
    if (score >= constants_1.CONFIDENCE_THRESHOLDS.HIGH)
        return types_1.ConfidenceLevel.HIGH;
    if (score >= constants_1.CONFIDENCE_THRESHOLDS.MEDIUM)
        return types_1.ConfidenceLevel.MEDIUM;
    return types_1.ConfidenceLevel.LOW;
}
/**
 * Build a FieldConfidence object from a raw score and reason string.
 */
function buildFieldConfidence(score, reason) {
    return {
        score,
        level: scoreToLevel(score),
        reason,
    };
}
/**
 * Truncate a string to a max length with ellipsis.
 */
function truncate(str, maxLen) {
    if (str.length <= maxLen)
        return str;
    return str.slice(0, maxLen - 3) + '...';
}
/**
 * Generate a unique request/correlation ID (browser-safe UUID v4).
 */
function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
/**
 * Format bytes to a human-readable string.
 */
function formatBytes(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
/**
 * Format milliseconds to a human-readable duration string.
 */
function formatDuration(ms) {
    if (ms < 1000)
        return `${ms}ms`;
    if (ms < 60000)
        return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}
/**
 * Estimate cost for Gemini 2.5 Flash tokens.
 * Pricing: $0.075 per 1M input tokens, $0.30 per 1M output tokens.
 */
function estimateGeminiCost(promptTokens, completionTokens) {
    const inputCost = (promptTokens / 1000000) * 0.075;
    const outputCost = (completionTokens / 1000000) * 0.30;
    return +(inputCost + outputCost).toFixed(6);
}
//# sourceMappingURL=index.js.map