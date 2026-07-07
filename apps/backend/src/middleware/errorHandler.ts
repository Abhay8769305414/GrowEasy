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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const requestId = (req as Request & { id?: string }).id ?? 'unknown';

  logger.error(
    {
      requestId,
      statusCode,
      code: err.code,
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
    code: err.code ?? 'INTERNAL_ERROR',
    requestId,
  });
}
