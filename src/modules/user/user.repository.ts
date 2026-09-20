import { prisma, isDatabaseConnected } from '../../config/database';
import { CreateUserInput } from './user.schema';
import { inMemoryRelationalStore } from '../../config/in-memory-relational';
import { v4 as uuidv4 } from 'uuid';

export class UserRepository {
  async findById(id: string) {
    if (!isDatabaseConnected) {
      return inMemoryRelationalStore.users.get(id) || null;
    }
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string) {
    if (!isDatabaseConnected) {
      for (const user of inMemoryRelationalStore.users.values()) {
        if (user.email === email) return user;
      }
      return null;
    }
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async create(data: CreateUserInput) {
    if (!isDatabaseConnected) {
      const user = {
        id: uuidv4(),
        name: data.name,
        email: data.email,
        avatarUrl: data.avatarUrl || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryRelationalStore.users.set(user.id, user);
      return user;
    }
    return prisma.user.create({
      data,
    });
  }

  async findMany() {
    if (!isDatabaseConnected) {
      return Array.from(inMemoryRelationalStore.users.values());
    }
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieves all chats the specified user belongs to,
   * including all member IDs and user profiles.
   */
  async getUserChatsWithMembers(userId: string) {
    if (!isDatabaseConnected) {
      const userChatIds = inMemoryRelationalStore.members
        .filter((m) => m.userId === userId)
        .map((m) => m.chatId);

      return Array.from(inMemoryRelationalStore.chats.values())
        .filter((chat) => userChatIds.includes(chat.id))
        .map((chat) => {
          const members = inMemoryRelationalStore.members
            .filter((m) => m.chatId === chat.id)
            .map((m) => ({
              ...m,
              user: inMemoryRelationalStore.users.get(m.userId)!,
            }));
          return {
            ...chat,
            members,
          };
        });
    }

    return prisma.chat.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }
}

export const userRepository = new UserRepository();
