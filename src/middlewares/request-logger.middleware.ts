import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { method, originalUrl } = req;
    const { statusCode } = res;

    logger.info(
      {
        method,
        url: originalUrl,
        statusCode,
        duration: `${duration}ms`,
      },
      `${method} ${originalUrl} ${statusCode} in ${duration}ms`
    );
  });

  next();
}
