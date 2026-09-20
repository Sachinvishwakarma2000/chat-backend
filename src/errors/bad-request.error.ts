import { AppError } from './app-error';
import { HttpStatus } from '../constants/http-status';
import { ErrorCode, ErrorCodeType } from '../constants/error-codes';

export class BadRequestError extends AppError {
  constructor(
    message: string = 'Bad request',
    errorCode: ErrorCodeType = ErrorCode.VALIDATION_ERROR,
    details?: unknown
  ) {
    super(message, HttpStatus.BAD_REQUEST, errorCode, details);
  }
}
