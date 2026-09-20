import admin from 'firebase-admin';
import fs from 'fs';
import { env } from './env';
import { logger } from '../utils/logger';

let firestoreInstance: admin.firestore.Firestore | null = null;
let isFirebaseLive = false;

export function initializeFirebase(): admin.firestore.Firestore | null {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  try {
    // 1. Check for Service Account File
    if (env.FIREBASE_SERVICE_ACCOUNT_PATH && fs.existsSync(env.FIREBASE_SERVICE_ACCOUNT_PATH)) {
      const serviceAccount = JSON.parse(fs.readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf-8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: env.FIREBASE_PROJECT_ID,
      });
      firestoreInstance = admin.firestore();
      isFirebaseLive = true;
      logger.info('✅ Firebase initialized with service account certificate');
      return firestoreInstance;
    }

    // 2. Check for environment credentials (Client Email & Private Key)
    if (env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        projectId: env.FIREBASE_PROJECT_ID,
      });
      firestoreInstance = admin.firestore();
      isFirebaseLive = true;
      logger.info('✅ Firebase initialized with environment service account');
      return firestoreInstance;
    }

    // 3. Check for Firestore Emulator
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      admin.initializeApp({
        projectId: env.FIREBASE_PROJECT_ID,
      });
      firestoreInstance = admin.firestore();
      isFirebaseLive = true;
      logger.info(`✅ Firebase initialized using Firestore Emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`);
      return firestoreInstance;
    }

    // 4. Fallback to In-Memory if live credentials are not present
    logger.warn('ℹ️ Firebase live credentials not provided. Using high-fidelity In-Memory Firestore adapter for local dev/testing.');
    return null;
  } catch (error) {
    logger.error({ error }, '⚠️ Error initializing Firebase Admin. Falling back to In-Memory Firestore.');
    return null;
  }
}

export function getFirestore(): admin.firestore.Firestore | null {
  return firestoreInstance;
}

export function isLiveFirestore(): boolean {
  return isFirebaseLive;
}
