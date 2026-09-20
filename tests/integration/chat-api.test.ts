import request from 'supertest';
import { app } from '../../src/app';
import { userRepository } from '../../src/modules/user/user.repository';
import { chatRepository } from '../../src/modules/chat/chat.repository';
import { getInMemoryMessageRepository } from '../../src/modules/message/message.repository.factory';
import { ChatType, MemberRole } from '@prisma/client';

describe('Chat Backend Integration Tests', () => {
  // In-memory relational store for testing without external DB requirement
  const mockUsers: Map<string, any> = new Map();
  const mockChats: Map<string, any> = new Map();
  const mockMembers: Array<{ id: string; chatId: string; userId: string; role: MemberRole; joinedAt: Date }> = [];
  const messageRepo = getInMemoryMessageRepository();

  beforeAll(() => {
    // Mock user repository
    jest.spyOn(userRepository, 'findById').mockImplementation(async (id: string) => {
      return mockUsers.get(id) || null;
    });

    jest.spyOn(userRepository, 'findByEmail').mockImplementation(async (email: string) => {
      for (const u of mockUsers.values()) {
        if (u.email === email) return u;
      }
      return null;
    });

    jest.spyOn(userRepository, 'create').mockImplementation(async (data: any) => {
      const user = {
        id: `user_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        name: data.name,
        email: data.email,
        avatarUrl: data.avatarUrl || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockUsers.set(user.id, user);
      return user;
    });

    jest.spyOn(userRepository, 'findMany').mockImplementation(async () => {
      return Array.from(mockUsers.values());
    });

    jest.spyOn(userRepository, 'getUserChatsWithMembers').mockImplementation(async (userId: string) => {
      const userChatIds = mockMembers
        .filter((m) => m.userId === userId)
        .map((m) => m.chatId);

      return Array.from(mockChats.values())
        .filter((chat) => userChatIds.includes(chat.id))
        .map((chat) => {
          const members = mockMembers
            .filter((m) => m.chatId === chat.id)
            .map((m) => ({
              ...m,
              user: mockUsers.get(m.userId),
            }));
          return {
            ...chat,
            members,
          };
        });
    });

    // Mock chat repository
    jest.spyOn(chatRepository, 'findById').mockImplementation(async (id: string) => {
      const chat = mockChats.get(id);
      if (!chat) return null;
      const members = mockMembers
        .filter((m) => m.chatId === id)
        .map((m) => ({
          ...m,
          user: mockUsers.get(m.userId),
        }));
      return { ...chat, members };
    });

    jest.spyOn(chatRepository, 'findDirectChatBetweenUsers').mockImplementation(async (userAId: string, userBId: string) => {
      for (const chat of mockChats.values()) {
        if (chat.type !== ChatType.DIRECT) continue;
        const chatMemberUserIds = mockMembers
          .filter((m) => m.chatId === chat.id)
          .map((m) => m.userId);

        if (chatMemberUserIds.includes(userAId) && chatMemberUserIds.includes(userBId)) {
          const members = mockMembers.filter((m) => m.chatId === chat.id);
          return { ...chat, members };
        }
      }
      return null;
    });

    jest.spyOn(chatRepository, 'createDirectChat').mockImplementation(async (userAId: string, userBId: string) => {
      const chatId = `chat_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const newChat = {
        id: chatId,
        type: ChatType.DIRECT,
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockChats.set(chatId, newChat);

      const memA = { id: `mem_1_${Date.now()}`, chatId, userId: userAId, role: MemberRole.MEMBER, joinedAt: new Date() };
      const memB = { id: `mem_2_${Date.now()}`, chatId, userId: userBId, role: MemberRole.MEMBER, joinedAt: new Date() };
      mockMembers.push(memA, memB);

      return {
        ...newChat,
        members: [memA, memB],
      };
    });

    jest.spyOn(chatRepository, 'isUserMemberOfChat').mockImplementation(async (chatId: string, userId: string) => {
      return mockMembers.some((m) => m.chatId === chatId && m.userId === userId);
    });

    jest.spyOn(chatRepository, 'createGroupChat').mockImplementation(async (name: string, adminId: string, memberIds: string[]) => {
      const chatId = `group_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const newChat = {
        id: chatId,
        type: ChatType.GROUP,
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockChats.set(chatId, newChat);

      const allMemberIds = Array.from(new Set([adminId, ...memberIds]));
      const members = allMemberIds.map((uid, idx) => ({
        id: `gmem_${idx}_${Date.now()}`,
        chatId,
        userId: uid,
        role: uid === adminId ? MemberRole.ADMIN : MemberRole.MEMBER,
        joinedAt: new Date(),
      }));

      mockMembers.push(...members);

      return {
        ...newChat,
        members,
      };
    });

    jest.spyOn(chatRepository, 'addMember').mockImplementation(async (chatId: string, userId: string, role: MemberRole = MemberRole.MEMBER) => {
      const mem = {
        id: `mem_${Date.now()}`,
        chatId,
        userId,
        role,
        joinedAt: new Date(),
      };
      mockMembers.push(mem);
      return mem;
    });
  });

  beforeEach(async () => {
    mockUsers.clear();
    mockChats.clear();
    mockMembers.length = 0;
    await messageRepo.clearTestData();
  });

  describe('Health Check', () => {
    it('GET /health should return 200 with service health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('UP');
    });
  });

  describe('API 1: Create or Get Chat (POST /chat/create)', () => {
    let userAId: string;
    let userBId: string;

    beforeEach(async () => {
      // Seed two test users
      const userA = await request(app)
        .post('/user')
        .send({ name: 'Alice', email: 'alice@example.com' });
      const userB = await request(app)
        .post('/user')
        .send({ name: 'Bob', email: 'bob@example.com' });

      userAId = userA.body.data.id;
      userBId = userB.body.data.id;
    });

    it('should create a new direct chat between two users and return chatId', async () => {
      const res = await request(app)
        .post('/chat/create')
        .send({ userAId, userBId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('chatId');
      expect(typeof res.body.data.chatId).toBe('string');
    });

    it('should return the existing chatId if chat already exists (Idempotent)', async () => {
      // First creation
      const res1 = await request(app)
        .post('/chat/create')
        .send({ userAId, userBId });

      const chatId1 = res1.body.data.chatId;

      // Second call (with reversed order userBId, userAId)
      const res2 = await request(app)
        .post('/chat/create')
        .send({ userAId: userBId, userBId: userAId });

      expect(res2.status).toBe(200);
      expect(res2.body.success).toBe(true);
      expect(res2.body.data.chatId).toBe(chatId1);
    });

    it('should reject direct chat creation with oneself (self-chat)', async () => {
      const res = await request(app)
        .post('/chat/create')
        .send({ userAId, userBId: userAId });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 if either user does not exist', async () => {
      const res = await request(app)
        .post('/chat/create')
        .send({ userAId, userBId: 'non-existent-user-id' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('API 2 & 3: Send & Get Messages (POST & GET /chat/:chatId/message*)', () => {
    let userAId: string;
    let userBId: string;
    let userCId: string;
    let chatId: string;

    beforeEach(async () => {
      const uA = await request(app).post('/user').send({ name: 'Alice', email: 'alice@test.com' });
      const uB = await request(app).post('/user').send({ name: 'Bob', email: 'bob@test.com' });
      const uC = await request(app).post('/user').send({ name: 'Charlie', email: 'charlie@test.com' });

      userAId = uA.body.data.id;
      userBId = uB.body.data.id;
      userCId = uC.body.data.id;

      const chatRes = await request(app).post('/chat/create').send({ userAId, userBId });
      chatId = chatRes.body.data.chatId;
    });

    it('should send a message and store it in Firestore with timestamp', async () => {
      const res = await request(app)
        .post(`/chat/${chatId}/message/send`)
        .send({
          senderId: userAId,
          text: 'Hello Bob! How are you?',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.chatId).toBe(chatId);
      expect(res.body.data.senderId).toBe(userAId);
      expect(res.body.data.text).toBe('Hello Bob! How are you?');
      expect(res.body.data).toHaveProperty('createdAt');
      expect(res.body.data.readBy).toContain(userAId);
    });

    it('should reject message sending by a non-member with 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/chat/${chatId}/message/send`)
        .send({
          senderId: userCId, // Charlie is NOT a member of Alice & Bob's chat
          text: 'Intruding message',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('NOT_CHAT_MEMBER');
    });

    it('should retrieve messages ordered chronologically', async () => {
      // Send 3 messages
      await request(app).post(`/chat/${chatId}/message/send`).send({ senderId: userAId, text: 'Message 1' });
      await request(app).post(`/chat/${chatId}/message/send`).send({ senderId: userBId, text: 'Message 2' });
      await request(app).post(`/chat/${chatId}/message/send`).send({ senderId: userAId, text: 'Message 3' });

      const res = await request(app).get(`/chat/${chatId}/messages?limit=50`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(3);
      expect(res.body.data[0].text).toBe('Message 1');
      expect(res.body.data[1].text).toBe('Message 2');
      expect(res.body.data[2].text).toBe('Message 3');
    });
  });

  describe('API 4: Mark Message Read (POST /chat/:chatId/message/:messageId/read)', () => {
    let userAId: string;
    let userBId: string;
    let chatId: string;
    let messageId: string;

    beforeEach(async () => {
      const uA = await request(app).post('/user').send({ name: 'Alice', email: 'alice@receipt.com' });
      const uB = await request(app).post('/user').send({ name: 'Bob', email: 'bob@receipt.com' });

      userAId = uA.body.data.id;
      userBId = uB.body.data.id;

      const chat = await request(app).post('/chat/create').send({ userAId, userBId });
      chatId = chat.body.data.chatId;

      const msg = await request(app)
        .post(`/chat/${chatId}/message/send`)
        .send({ senderId: userAId, text: 'Hey Bob, check this out' });

      messageId = msg.body.data.id;
    });

    it('should update read receipt in Firestore for recipient', async () => {
      const res = await request(app)
        .post(`/chat/${chatId}/message/${messageId}/read`)
        .send({ userId: userBId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.readBy).toContain(userAId);
      expect(res.body.data.readBy).toContain(userBId);
    });

    it('should return 404 if messageId does not exist', async () => {
      const res = await request(app)
        .post(`/chat/${chatId}/message/non-existent-msg/read`)
        .send({ userId: userBId });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('MESSAGE_NOT_FOUND');
    });
  });

  describe('API 5: Update Last Seen (POST /chat/:chatId/lastseen)', () => {
    let userAId: string;
    let userBId: string;
    let chatId: string;
    let messageId: string;

    beforeEach(async () => {
      const uA = await request(app).post('/user').send({ name: 'Alice', email: 'alice@lastseen.com' });
      const uB = await request(app).post('/user').send({ name: 'Bob', email: 'bob@lastseen.com' });

      userAId = uA.body.data.id;
      userBId = uB.body.data.id;

      const chat = await request(app).post('/chat/create').send({ userAId, userBId });
      chatId = chat.body.data.chatId;

      const msg = await request(app)
        .post(`/chat/${chatId}/message/send`)
        .send({ senderId: userAId, text: 'Last seen test message' });

      messageId = msg.body.data.id;
    });

    it('should update last seen message for user in Firestore', async () => {
      const res = await request(app)
        .post(`/chat/${chatId}/lastseen`)
        .send({ userId: userBId, messageId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe(userBId);
      expect(res.body.data.messageId).toBe(messageId);
      expect(res.body.data).toHaveProperty('updatedAt');

      // Fetch last seen to verify persistence
      const getRes = await request(app).get(`/chat/${chatId}/lastseen`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data[userBId].messageId).toBe(messageId);
    });
  });

  describe('API 6: List User Chats (GET /user/:userId/chats)', () => {
    let userAId: string;
    let userBId: string;
    let userCId: string;

    beforeEach(async () => {
      const uA = await request(app).post('/user').send({ name: 'Alice', email: 'alice@listchats.com' });
      const uB = await request(app).post('/user').send({ name: 'Bob', email: 'bob@listchats.com' });
      const uC = await request(app).post('/user').send({ name: 'Charlie', email: 'charlie@listchats.com' });

      userAId = uA.body.data.id;
      userBId = uB.body.data.id;
      userCId = uC.body.data.id;

      // Alice & Bob chat
      await request(app).post('/chat/create').send({ userAId, userBId });
      // Alice & Charlie chat
      await request(app).post('/chat/create').send({ userAId, userBId: userCId });
    });

    it('should return list of all chats belonging to user with member IDs', async () => {
      const res = await request(app).get(`/user/${userAId}/chats`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);

      const firstChat = res.body.data[0];
      expect(firstChat).toHaveProperty('chatId');
      expect(firstChat).toHaveProperty('memberIds');
      expect(firstChat.memberIds).toContain(userAId);
      expect(firstChat).toHaveProperty('members');
      expect(firstChat.members.length).toBe(2);
    });

    it('should return 404 if userId does not exist', async () => {
      const res = await request(app).get('/user/ghost-user-id/chats');
      expect(res.status).toBe(404);
    });
  });

  describe('Bonus APIs: Edit, Soft Delete & Group Chat', () => {
    let userAId: string;
    let userBId: string;
    let userCId: string;
    let chatId: string;
    let messageId: string;

    beforeEach(async () => {
      const uA = await request(app).post('/user').send({ name: 'Alice', email: 'alice@bonus.com' });
      const uB = await request(app).post('/user').send({ name: 'Bob', email: 'bob@bonus.com' });
      const uC = await request(app).post('/user').send({ name: 'Charlie', email: 'charlie@bonus.com' });

      userAId = uA.body.data.id;
      userBId = uB.body.data.id;
      userCId = uC.body.data.id;

      const chat = await request(app).post('/chat/create').send({ userAId, userBId });
      chatId = chat.body.data.chatId;

      const msg = await request(app)
        .post(`/chat/${chatId}/message/send`)
        .send({ senderId: userAId, text: 'Original message' });

      messageId = msg.body.data.id;
    });

    it('should allow sender to edit their message', async () => {
      const res = await request(app)
        .patch(`/chat/${chatId}/message/${messageId}`)
        .send({ senderId: userAId, text: 'Edited text' });

      expect(res.status).toBe(200);
      expect(res.body.data.text).toBe('Edited text');
      expect(res.body.data.isEdited).toBe(true);
    });

    it('should prevent non-sender from editing message with 403', async () => {
      const res = await request(app)
        .patch(`/chat/${chatId}/message/${messageId}`)
        .send({ senderId: userBId, text: 'Malicious edit' });

      expect(res.status).toBe(403);
    });

    it('should allow sender to soft-delete message', async () => {
      const res = await request(app)
        .delete(`/chat/${chatId}/message/${messageId}`)
        .send({ senderId: userAId });

      expect(res.status).toBe(200);
      expect(res.body.data.isDeleted).toBe(true);
      expect(res.body.data.text).toBe('[This message was deleted]');
    });

    it('should create a group chat with admin and multiple members', async () => {
      const res = await request(app)
        .post('/chat/group/create')
        .send({
          name: 'Engineers Core',
          adminId: userAId,
          memberIds: [userBId, userCId],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.groupChat.type).toBe('GROUP');
      expect(res.body.data.groupChat.name).toBe('Engineers Core');
      expect(res.body.data.groupChat.members.length).toBe(3);
    });
  });
});
