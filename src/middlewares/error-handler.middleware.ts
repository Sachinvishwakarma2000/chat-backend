import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../errors/app-error';
import { ApiResponse } from '../utils/api-response';
import { HttpStatus } from '../constants/http-status';
import { ErrorCode } from '../constants/error-codes';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): Response {
  logger.error(
    {
      err: {
        name: err.name,
        message: err.message,
        stack: err.stack,
      },
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
    },
    `Error processing request: ${err.message}`
  );

  // 1. Custom Application Operational Error
  if (err instanceof AppError) {
    return ApiResponse.error(
      res,
      err.message,
      err.statusCode,
      err.errorCode,
      err.details
    );
  }

  // 2. Prisma Database Specific Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation (e.g. email or composite chat_members)
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[])?.join(', ') || 'field';
      return ApiResponse.error(
        res,
        `Unique constraint violation on: ${target}`,
        HttpStatus.CONFLICT,
        ErrorCode.CONFLICT_ERROR,
        err.meta
      );
    }

    // Record not found
    if (err.code === 'P2025') {
      return ApiResponse.error(
        res,
        'Requested database record was not found',
        HttpStatus.NOT_FOUND,
        ErrorCode.RESOURCE_NOT_FOUND
      );
    }

    // Foreign key constraint failure
    if (err.code === 'P2003') {
      return ApiResponse.error(
        res,
        'Foreign key constraint failed',
        HttpStatus.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        err.meta
      );
    }
  }

  // 3. JSON body parsing error
  if (err instanceof SyntaxError && 'body' in err) {
    return ApiResponse.error(
      res,
      'Malformed JSON payload',
      HttpStatus.BAD_REQUEST,
      ErrorCode.VALIDATION_ERROR
    );
  }

  // 4. Fallback Generic 500 Error
  const isProduction = process.env.NODE_ENV === 'production';
  return ApiResponse.error(
    res,
    isProduction ? 'Internal server error occurred' : err.message,
    HttpStatus.INTERNAL_SERVER_ERROR,
    ErrorCode.INTERNAL_ERROR,
    isProduction ? undefined : { stack: err.stack }
  );
}
