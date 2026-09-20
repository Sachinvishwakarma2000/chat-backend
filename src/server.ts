import { app } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { connectDatabase, disconnectDatabase } from './config/database';
import { initializeFirebase } from './config/firebase';
import { Server } from 'http';

let server: Server;

async function bootstrap() {
  try {
    // 1. Initialize Firebase Admin SDK / Firestore
    initializeFirebase();

    // 2. Connect to Relational Database via Prisma
    await connectDatabase();

    // 3. Start Express HTTP Server
    server = app.listen(env.PORT, () => {
      logger.info(
        `🚀 Chat Backend Server running on http://localhost:${env.PORT} in [${env.NODE_ENV}] mode`
      );
      logger.info(`Health check available at http://localhost:${env.PORT}/health`);
    });
  } catch (error) {
    logger.error({ error }, '💥 Failed to bootstrap server');
    process.exit(1);
  }
}

// Graceful Shutdown Logic
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      await disconnectDatabase();
      logger.info('Cleanup finished. Exiting process.');
      process.exit(0);
    });

    // Force exit if shutdown takes too long
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason: Error) => {
  logger.error({ reason }, 'Unhandled Promise Rejection');
});

process.on('uncaughtException', (error: Error) => {
  logger.error({ error }, 'Uncaught Exception thrown');
  gracefulShutdown('uncaughtException');
});

bootstrap();
