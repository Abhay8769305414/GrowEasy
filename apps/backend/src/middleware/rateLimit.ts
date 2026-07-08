import { rateLimit } from 'express-rate-limit';

/**
 * Rate limiter for the CSV upload/preview endpoint.
 * Allows 10 uploads per IP per minute.
 */
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many upload requests from this IP address. Please try again in 1 minute.',
    details: [],
  },
});

/**
 * Rate limiter for the import start endpoint.
 */
export const importRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many import requests from this IP address. Please try again in 1 minute.',
    details: [],
  },
});

/**
 * Rate limiter for download endpoints.
 */
export const downloadRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many download requests from this IP address. Please try again in 1 minute.',
    details: [],
  },
});

/**
 * General API rate limiter — applied globally to /api/* routes.
 * Allows 200 requests per IP per 15 minutes.
 */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests from this IP address. Please try again later.',
    details: [],
  },
});