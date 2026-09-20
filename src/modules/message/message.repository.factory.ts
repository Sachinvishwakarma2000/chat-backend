import { getFirestore, isLiveFirestore } from '../../config/firebase';
import { IFirestoreRepository } from './message.types';
import { FirestoreMessageRepository } from './message.firestore.repository';
import { InMemoryMessageRepository } from './message.memory.repository';
import { env } from '../../config/env';

let instance: IFirestoreRepository | null = null;
let inMemoryInstance: InMemoryMessageRepository | null = null;

export function getMessageRepository(): IFirestoreRepository {
  if (instance) {
    return instance;
  }

  const firestore = getFirestore();
  if (firestore && isLiveFirestore() && !env.USE_IN_MEMORY_FIRESTORE) {
    instance = new FirestoreMessageRepository(firestore);
    return instance;
  }

  if (!inMemoryInstance) {
    inMemoryInstance = new InMemoryMessageRepository();
  }
  instance = inMemoryInstance;
  return instance;
}

export function getInMemoryMessageRepository(): InMemoryMessageRepository {
  if (!inMemoryInstance) {
    inMemoryInstance = new InMemoryMessageRepository();
  }
  return inMemoryInstance;
}
