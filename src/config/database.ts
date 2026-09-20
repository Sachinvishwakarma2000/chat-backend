import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ||
  new PrismaClient({
    log: [
      { emit: 'event', level: 'warn' },
      { emit: 'event', level: 'error' },
    ],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export let isDatabaseConnected = false;

// Connect to Database
export async function connectDatabase(): Promise<boolean> {
  try {
    await prisma.$connect();
    isDatabaseConnected = true;
    logger.info('✅ Relational Database connected successfully via Prisma');
    return true;
  } catch (error: any) {
    isDatabaseConnected = false;
    logger.warn(
      `⚠️ Could not connect to MySQL at DATABASE_URL (${error?.message || 'Check credentials'}).`
    );
    logger.info(
      '💡 Starting in developer fallback mode: APIs will use in-memory store so you can test endpoints immediately!'
    );
    return false;
  }
}

// Disconnect Database
export async function disconnectDatabase(): Promise<void> {
  if (!isDatabaseConnected) return;
  try {
    await prisma.$disconnect();
    logger.info('Relational Database disconnected');
  } catch (error) {
    logger.error({ error }, 'Error disconnecting from Relational Database');
  }
}
