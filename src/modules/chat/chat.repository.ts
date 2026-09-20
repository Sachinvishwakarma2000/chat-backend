import { prisma, isDatabaseConnected } from '../../config/database';
import { ChatType, MemberRole } from '@prisma/client';
import { inMemoryRelationalStore } from '../../config/in-memory-relational';
import { v4 as uuidv4 } from 'uuid';

export class ChatRepository {
  async findById(id: string) {
    if (!isDatabaseConnected) {
      const chat = inMemoryRelationalStore.chats.get(id);
      if (!chat) return null;
      const members = inMemoryRelationalStore.members
        .filter((m) => m.chatId === id)
        .map((m) => ({
          ...m,
          user: inMemoryRelationalStore.users.get(m.userId)!,
        }));
      return { ...chat, members };
    }

    return prisma.chat.findUnique({
      where: { id },
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
    });
  }

  /**
   * Finds an existing direct (1:1) chat between two users if one exists.
   */
  async findDirectChatBetweenUsers(userAId: string, userBId: string) {
    if (!isDatabaseConnected) {
      for (const chat of inMemoryRelationalStore.chats.values()) {
        if (chat.type !== ChatType.DIRECT) continue;
        const chatMemberUserIds = inMemoryRelationalStore.members
          .filter((m) => m.chatId === chat.id)
          .map((m) => m.userId);

        if (chatMemberUserIds.includes(userAId) && chatMemberUserIds.includes(userBId)) {
          const members = inMemoryRelationalStore.members.filter((m) => m.chatId === chat.id);
          return { ...chat, members };
        }
      }
      return null;
    }

    return prisma.chat.findFirst({
      where: {
        type: ChatType.DIRECT,
        AND: [
          {
            members: {
              some: {
                userId: userAId,
              },
            },
          },
          {
            members: {
              some: {
                userId: userBId,
              },
            },
          },
        ],
      },
      include: {
        members: true,
      },
    });
  }

  /**
   * Creates a 1:1 direct chat with both participants atomically.
   */
  async createDirectChat(userAId: string, userBId: string) {
    if (!isDatabaseConnected) {
      const chatId = uuidv4();
      const newChat = {
        id: chatId,
        type: ChatType.DIRECT,
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryRelationalStore.chats.set(chatId, newChat);

      const memA = {
        id: uuidv4(),
        chatId,
        userId: userAId,
        role: MemberRole.MEMBER,
        joinedAt: new Date(),
      };
      const memB = {
        id: uuidv4(),
        chatId,
        userId: userBId,
        role: MemberRole.MEMBER,
        joinedAt: new Date(),
      };
      inMemoryRelationalStore.members.push(memA, memB);

      return {
        ...newChat,
        members: [memA, memB],
      };
    }

    return prisma.chat.create({
      data: {
        type: ChatType.DIRECT,
        members: {
          create: [
            { userId: userAId, role: MemberRole.MEMBER },
            { userId: userBId, role: MemberRole.MEMBER },
          ],
        },
      },
      include: {
        members: true,
      },
    });
  }

  /**
   * Creates a group chat with an admin and initial members.
   */
  async createGroupChat(name: string, adminId: string, memberIds: string[]) {
    if (!isDatabaseConnected) {
      const chatId = uuidv4();
      const newChat = {
        id: chatId,
        type: ChatType.GROUP,
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryRelationalStore.chats.set(chatId, newChat);

      const allMemberIds = Array.from(new Set([adminId, ...memberIds]));
      const members = allMemberIds.map((uid) => ({
        id: uuidv4(),
        chatId,
        userId: uid,
        role: uid === adminId ? MemberRole.ADMIN : MemberRole.MEMBER,
        joinedAt: new Date(),
      }));

      inMemoryRelationalStore.members.push(...members);

      return {
        ...newChat,
        members,
      };
    }

    const uniqueMemberIds = Array.from(new Set(memberIds)).filter((id) => id !== adminId);

    return prisma.chat.create({
      data: {
        type: ChatType.GROUP,
        name,
        members: {
          create: [
            { userId: adminId, role: MemberRole.ADMIN },
            ...uniqueMemberIds.map((userId) => ({
              userId,
              role: MemberRole.MEMBER,
            })),
          ],
        },
      },
      include: {
        members: true,
      },
    });
  }

  /**
   * Checks whether a given user is a member of the chat.
   */
  async isUserMemberOfChat(chatId: string, userId: string): Promise<boolean> {
    if (!isDatabaseConnected) {
      return inMemoryRelationalStore.members.some(
        (m) => m.chatId === chatId && m.userId === userId
      );
    }

    const member = await prisma.chatMember.findUnique({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
    });

    return !!member;
  }

  /**
   * Adds a new member to an existing chat.
   */
  async addMember(chatId: string, userId: string, role: MemberRole = MemberRole.MEMBER) {
    if (!isDatabaseConnected) {
      const mem = {
        id: uuidv4(),
        chatId,
        userId,
        role,
        joinedAt: new Date(),
      };
      inMemoryRelationalStore.members.push(mem);
      return mem;
    }

    return prisma.chatMember.create({
      data: {
        chatId,
        userId,
        role,
      },
    });
  }
}

export const chatRepository = new ChatRepository();
