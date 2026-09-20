import { Request, Response } from 'express';
import { ApiResponse } from '../utils/api-response';
import { HttpStatus } from '../constants/http-status';
import { ErrorCode } from '../constants/error-codes';

export function notFoundHandler(req: Request, res: Response): Response {
  return ApiResponse.error(
    res,
    `Route ${req.method} ${req.originalUrl} not found on this server`,
    HttpStatus.NOT_FOUND,
    ErrorCode.RESOURCE_NOT_FOUND
  );
}
