import { ChatType, MemberRole } from '@prisma/client';

export interface InMemoryUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InMemoryChatMember {
  id: string;
  chatId: string;
  userId: string;
  role: MemberRole;
  joinedAt: Date;
}

export interface InMemoryChat {
  id: string;
  type: ChatType;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class InMemoryRelationalStore {
  public users: Map<string, InMemoryUser> = new Map();
  public chats: Map<string, InMemoryChat> = new Map();
  public members: InMemoryChatMember[] = [];

  constructor() {
    // Seed initial users so testing works immediately
    const userA: InMemoryUser = {
      id: 'usr_alice_001',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const userB: InMemoryUser = {
      id: 'usr_bob_002',
      name: 'Bob Smith',
      email: 'bob@example.com',
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(userA.id, userA);
    this.users.set(userB.id, userB);
  }
}

export const inMemoryRelationalStore = new InMemoryRelationalStore();
