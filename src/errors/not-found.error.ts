import { AppError } from './app-error';
import { HttpStatus } from '../constants/http-status';
import { ErrorCode, ErrorCodeType } from '../constants/error-codes';

export class NotFoundError extends AppError {
  constructor(
    message: string = 'Resource not found',
    errorCode: ErrorCodeType = ErrorCode.RESOURCE_NOT_FOUND,
    details?: unknown
  ) {
    super(message, HttpStatus.NOT_FOUND, errorCode, details);
  }
}
