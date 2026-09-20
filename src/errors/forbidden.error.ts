import { AppError } from './app-error';
import { HttpStatus } from '../constants/http-status';
import { ErrorCode, ErrorCodeType } from '../constants/error-codes';

export class ForbiddenError extends AppError {
  constructor(
    message: string = 'Forbidden access',
    errorCode: ErrorCodeType = ErrorCode.FORBIDDEN_ACCESS,
    details?: unknown
  ) {
    super(message, HttpStatus.FORBIDDEN, errorCode, details);
  }
}
