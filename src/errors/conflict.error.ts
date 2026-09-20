import { AppError } from './app-error';
import { HttpStatus } from '../constants/http-status';
import { ErrorCode, ErrorCodeType } from '../constants/error-codes';

export class ConflictError extends AppError {
  constructor(
    message: string = 'Resource conflict',
    errorCode: ErrorCodeType = ErrorCode.CONFLICT_ERROR,
    details?: unknown
  ) {
    super(message, HttpStatus.CONFLICT, errorCode, details);
  }
}
