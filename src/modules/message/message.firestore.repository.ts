import admin from 'firebase-admin';
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

export class FirestoreMessageRepository implements IFirestoreRepository {
  private db: admin.firestore.Firestore;

  constructor(db: admin.firestore.Firestore) {
    this.db = db;
  }

  private getMessagesCollection(chatId: string) {
    return this.db.collection('chats').doc(chatId).collection('messages');
  }

  private getChatDoc(chatId: string) {
    return this.db.collection('chats').doc(chatId);
  }

  async createMessage(
    payload: Omit<MessageDocument, 'id' | 'createdAt' | 'readBy'>
  ): Promise<MessageDocument> {
    const messageId = uuidv4();
    const now = new Date().toISOString();
    const messageRef = this.getMessagesCollection(payload.chatId).doc(messageId);

    const messageData: MessageDocument = {
      id: messageId,
      chatId: payload.chatId,
      senderId: payload.senderId,
      text: payload.text,
      createdAt: now,
      readBy: [payload.senderId], // sender inherently has read their own message
      isEdited: false,
      isDeleted: false,
      updatedAt: now,
    };

    await messageRef.set(messageData);
    return messageData;
  }

  async getMessageById(chatId: string, messageId: string): Promise<MessageDocument | null> {
    const doc = await this.getMessagesCollection(chatId).doc(messageId).get();
    if (!doc.exists) {
      return null;
    }
    return doc.data() as MessageDocument;
  }

  async getMessages(chatId: string, options: GetMessagesOptions): Promise<MessageDocument[]> {
    let query = this.getMessagesCollection(chatId)
      .orderBy('createdAt', 'desc')
      .limit(options.limit);

    if (options.before) {
      // Fetch cursor document if before timestamp or messageId is provided
      const cursorDoc = await this.getMessagesCollection(chatId).doc(options.before).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    const messages: MessageDocument[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data() as MessageDocument;
      // Sanitize deleted messages if needed
      if (data.isDeleted) {
        data.text = '[This message was deleted]';
      }
      messages.push(data);
    });

    // Return in chronological order (oldest to newest)
    return messages.reverse();
  }

  async markMessageRead(chatId: string, messageId: string, userId: string): Promise<MessageDocument> {
    const messageRef = this.getMessagesCollection(chatId).doc(messageId);
    const doc = await messageRef.get();

    if (!doc.exists) {
      throw new NotFoundError(`Message with ID '${messageId}' not found`, ErrorCode.MESSAGE_NOT_FOUND);
    }

    await messageRef.update({
      readBy: admin.firestore.FieldValue.arrayUnion(userId),
      updatedAt: new Date().toISOString(),
    });

    const updatedDoc = await messageRef.get();
    return updatedDoc.data() as MessageDocument;
  }

  async updateLastSeen(chatId: string, userId: string, messageId: string): Promise<LastSeenRecord> {
    const chatRef = this.getChatDoc(chatId);
    const now = new Date().toISOString();

    const lastSeenRecord: LastSeenRecord = {
      userId,
      messageId,
      updatedAt: now,
    };

    await chatRef.set(
      {
        lastSeen: {
          [userId]: {
            messageId,
            updatedAt: now,
          },
        },
      },
      { merge: true }
    );

    return lastSeenRecord;
  }

  async getLastSeen(chatId: string): Promise<Record<string, LastSeenRecord>> {
    const chatDoc = await this.getChatDoc(chatId).get();
    if (!chatDoc.exists) {
      return {};
    }

    const data = chatDoc.data();
    return (data?.lastSeen || {}) as Record<string, LastSeenRecord>;
  }

  async editMessage(
    chatId: string,
    messageId: string,
    senderId: string,
    newText: string
  ): Promise<MessageDocument> {
    const messageRef = this.getMessagesCollection(chatId).doc(messageId);
    const doc = await messageRef.get();

    if (!doc.exists) {
      throw new NotFoundError(`Message with ID '${messageId}' not found`, ErrorCode.MESSAGE_NOT_FOUND);
    }

    const message = doc.data() as MessageDocument;

    if (message.senderId !== senderId) {
      throw new ForbiddenError('You can only edit your own messages', ErrorCode.FORBIDDEN_ACCESS);
    }

    if (message.isDeleted) {
      throw new ForbiddenError('Cannot edit a deleted message', ErrorCode.FORBIDDEN_ACCESS);
    }

    const now = new Date().toISOString();
    await messageRef.update({
      text: newText,
      isEdited: true,
      updatedAt: now,
    });

    const updated = await messageRef.get();
    return updated.data() as MessageDocument;
  }

  async deleteMessage(chatId: string, messageId: string, senderId: string): Promise<MessageDocument> {
    const messageRef = this.getMessagesCollection(chatId).doc(messageId);
    const doc = await messageRef.get();

    if (!doc.exists) {
      throw new NotFoundError(`Message with ID '${messageId}' not found`, ErrorCode.MESSAGE_NOT_FOUND);
    }

    const message = doc.data() as MessageDocument;

    if (message.senderId !== senderId) {
      throw new ForbiddenError('You can only delete your own messages', ErrorCode.FORBIDDEN_ACCESS);
    }

    const now = new Date().toISOString();
    await messageRef.update({
      isDeleted: true,
      text: '[This message was deleted]',
      updatedAt: now,
    });

    const updated = await messageRef.get();
    return updated.data() as MessageDocument;
  }
}
