import { v4 as uuidv4 } from 'uuid';
import {
  IFirestoreRepository,
  MessageDocument,
  LastSeenRecord,
  GetMessagesOptions,
} from './message.types';
import { NotFoundError } from '../../errors/not-found.error';
import { ForbiddenError } from '../../errors/forbidden.error';
import { ErrorCode } from '../../constants/error-codes';

export class InMemoryMessageRepository implements IFirestoreRepository {
  // chatId -> Map<messageId, MessageDocument>
  private messagesByChat: Map<string, Map<string, MessageDocument>> = new Map();

  // chatId -> Map<userId, LastSeenRecord>
  private lastSeenByChat: Map<string, Map<string, LastSeenRecord>> = new Map();

  private getChatMessagesMap(chatId: string): Map<string, MessageDocument> {
    if (!this.messagesByChat.has(chatId)) {
      this.messagesByChat.set(chatId, new Map());
    }
    return this.messagesByChat.get(chatId)!;
  }

  private getChatLastSeenMap(chatId: string): Map<string, LastSeenRecord> {
    if (!this.lastSeenByChat.has(chatId)) {
      this.lastSeenByChat.set(chatId, new Map());
    }
    return this.lastSeenByChat.get(chatId)!;
  }

  async createMessage(
    payload: Omit<MessageDocument, 'id' | 'createdAt' | 'readBy'>
  ): Promise<MessageDocument> {
    const messageId = uuidv4();
    const now = new Date().toISOString();

    const message: MessageDocument = {
      id: messageId,
      chatId: payload.chatId,
      senderId: payload.senderId,
      text: payload.text,
      createdAt: now,
      readBy: [payload.senderId],
      isEdited: false,
      isDeleted: false,
      updatedAt: now,
    };

    const chatMap = this.getChatMessagesMap(payload.chatId);
    chatMap.set(messageId, message);
    return { ...message };
  }

  async getMessageById(chatId: string, messageId: string): Promise<MessageDocument | null> {
    const chatMap = this.getChatMessagesMap(chatId);
    const message = chatMap.get(messageId);
    return message ? { ...message } : null;
  }

  async getMessages(chatId: string, options: GetMessagesOptions): Promise<MessageDocument[]> {
    const chatMap = this.getChatMessagesMap(chatId);
    let all = Array.from(chatMap.values());

    // Sort descending by timestamp initially
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (options.before) {
      const cursorIndex = all.findIndex(
        (m) => m.id === options.before || m.createdAt === options.before
      );
      if (cursorIndex !== -1) {
        all = all.slice(cursorIndex + 1);
      }
    }

    const limited = all.slice(0, options.limit);

    // Sanitize and return in ascending (chronological) order
    const result = limited.map((msg) => ({
      ...msg,
      text: msg.isDeleted ? '[This message was deleted]' : msg.text,
    }));

    return result.reverse();
  }

  async markMessageRead(chatId: string, messageId: string, userId: string): Promise<MessageDocument> {
    const chatMap = this.getChatMessagesMap(chatId);
    const message = chatMap.get(messageId);

    if (!message) {
      throw new NotFoundError(`Message with ID '${messageId}' not found`, ErrorCode.MESSAGE_NOT_FOUND);
    }

    if (!message.readBy.includes(userId)) {
      message.readBy.push(userId);
    }
    message.updatedAt = new Date().toISOString();

    return { ...message };
  }

  async updateLastSeen(chatId: string, userId: string, messageId: string): Promise<LastSeenRecord> {
    const lastSeenMap = this.getChatLastSeenMap(chatId);
    const now = new Date().toISOString();

    const record: LastSeenRecord = {
      userId,
      messageId,
      updatedAt: now,
    };

    lastSeenMap.set(userId, record);
    return { ...record };
  }

  async getLastSeen(chatId: string): Promise<Record<string, LastSeenRecord>> {
    const lastSeenMap = this.getChatLastSeenMap(chatId);
    const result: Record<string, LastSeenRecord> = {};
    for (const [userId, record] of lastSeenMap.entries()) {
      result[userId] = { ...record };
    }
    return result;
  }

  async editMessage(
    chatId: string,
    messageId: string,
    senderId: string,
    newText: string
  ): Promise<MessageDocument> {
    const chatMap = this.getChatMessagesMap(chatId);
    const message = chatMap.get(messageId);

    if (!message) {
      throw new NotFoundError(`Message with ID '${messageId}' not found`, ErrorCode.MESSAGE_NOT_FOUND);
    }

    if (message.senderId !== senderId) {
      throw new ForbiddenError('You can only edit your own messages', ErrorCode.FORBIDDEN_ACCESS);
    }

    if (message.isDeleted) {
      throw new ForbiddenError('Cannot edit a deleted message', ErrorCode.FORBIDDEN_ACCESS);
    }

    message.text = newText;
    message.isEdited = true;
    message.updatedAt = new Date().toISOString();

    return { ...message };
  }

  async deleteMessage(chatId: string, messageId: string, senderId: string): Promise<MessageDocument> {
    const chatMap = this.getChatMessagesMap(chatId);
    const message = chatMap.get(messageId);

    if (!message) {
      throw new NotFoundError(`Message with ID '${messageId}' not found`, ErrorCode.MESSAGE_NOT_FOUND);
    }

    if (message.senderId !== senderId) {
      throw new ForbiddenError('You can only delete your own messages', ErrorCode.FORBIDDEN_ACCESS);
    }

    message.isDeleted = true;
    message.text = '[This message was deleted]';
    message.updatedAt = new Date().toISOString();

    return { ...message };
  }

  async clearTestData(): Promise<void> {
    this.messagesByChat.clear();
    this.lastSeenByChat.clear();
  }
}
