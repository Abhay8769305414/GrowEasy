import { Request, Response, NextFunction } from 'express';
import { logger } from '../services/logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export function createError(
  message: string,
  statusCode = 500,
  code = 'INTERNAL_ERROR'
): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  err.isOperational = true;
  return err;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = err.statusCode ?? 500;
  let code = err.code ?? 'INTERNAL_ERROR';

  // Map specific library and custom errors to HTTP status codes
  if (err.name === 'MulterError') {
    code = `MULTIPART_${err.code ?? 'ERROR'}`;
    if (err.code === 'LIMIT_FILE_SIZE') {
      statusCode = 413; // Payload Too Large
    } else {
      statusCode = 400; // Bad Request
    }
  } else if (code === 'INVALID_FILE_TYPE') {
    statusCode = 415; // Unsupported Media Type
  } else if (code === 'RATE_LIMIT_EXCEEDED') {
    statusCode = 429; // Too Many Requests
  } else if (code === 'VALIDATION_ERROR' || err.name === 'ZodError') {
    statusCode = 400; // Bad Request
    code = 'VALIDATION_ERROR';
  } else if (code === 'PARSE_ERROR') {
    statusCode = 422; // Unprocessable Entity
  } else if (code === 'JOB_NOT_FOUND' || code === 'NOT_FOUND') {
    statusCode = 404; // Not Found
  }

  const requestId = (req as Request & { id?: string }).id ?? 'unknown';

  logger.error(
    {
      requestId,
      statusCode,
      code,
      path: req.path,
      method: req.method,
      message: err.message,
      stack: err.stack,
    },
    'Request error'
  );

  res.status(statusCode).json({
    success: false,
    error: err.message,
    code,
    requestId,
  });
}
