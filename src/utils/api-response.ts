import { Response } from 'express';
import { HttpStatus, HttpStatusCode } from '../constants/http-status';

export interface ApiResponsePayload<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class ApiResponse {
  static success<T>(
    res: Response,
    data?: T,
    message?: string,
    statusCode: HttpStatusCode = HttpStatus.OK,
    meta?: Record<string, unknown>
  ): Response {
    const payload: ApiResponsePayload<T> = {
      success: true,
      ...(message && { message }),
      ...(data !== undefined && { data }),
      ...(meta && { meta }),
    };

    return res.status(statusCode).json(payload);
  }

  static created<T>(
    res: Response,
    data?: T,
    message?: string,
    meta?: Record<string, unknown>
  ): Response {
    return ApiResponse.success(res, data, message, HttpStatus.CREATED, meta);
  }

  static error(
    res: Response,
    message: string,
    statusCode: HttpStatusCode = HttpStatus.INTERNAL_SERVER_ERROR,
    code: string = 'INTERNAL_ERROR',
    details?: unknown
  ): Response {
    const payload: ApiResponsePayload = {
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined && { details }),
      },
    };

    return res.status(statusCode).json(payload);
  }
}
