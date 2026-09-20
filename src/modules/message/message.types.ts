export interface MessageDocument {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string; // ISO timestamp
  readBy: string[];
  isEdited?: boolean;
  isDeleted?: boolean;
  updatedAt?: string;
}

export interface LastSeenRecord {
  userId: string;
  messageId: string;
  updatedAt: string;
}

export interface GetMessagesOptions {
  limit: number;
  before?: string; // Cursor timestamp or messageId
}

export interface IFirestoreRepository {
  createMessage(message: Omit<MessageDocument, 'id' | 'createdAt' | 'readBy'>): Promise<MessageDocument>;
  getMessageById(chatId: string, messageId: string): Promise<MessageDocument | null>;
  getMessages(chatId: string, options: GetMessagesOptions): Promise<MessageDocument[]>;
  markMessageRead(chatId: string, messageId: string, userId: string): Promise<MessageDocument>;
  updateLastSeen(chatId: string, userId: string, messageId: string): Promise<LastSeenRecord>;
  getLastSeen(chatId: string): Promise<Record<string, LastSeenRecord>>;
  editMessage(chatId: string, messageId: string, senderId: string, newText: string): Promise<MessageDocument>;
  deleteMessage(chatId: string, messageId: string, senderId: string): Promise<MessageDocument>;
  clearTestData?(): Promise<void>;
}
