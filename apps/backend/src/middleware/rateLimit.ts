import { rateLimit } from 'express-rate-limit';

/**
 * Rate limiter for the CSV upload endpoint.
 * Allows 20 uploads per IP per 15 minutes to prevent abuse.
 */
export const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many uploads from this IP address. Please try again in 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Rate limiter for general API endpoints.
 * Allows 200 requests per IP per 15 minutes.
 */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP address. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});
