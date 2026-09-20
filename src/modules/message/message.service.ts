import { IFirestoreRepository } from './message.types';
import { getMessageRepository } from './message.repository.factory';
import { ChatService, chatService } from '../chat/chat.service';
import {
  SendMessageInput,
  GetMessagesQuery,
  MarkMessageReadInput,
  UpdateLastSeenInput,
  EditMessageInput,
  DeleteMessageInput,
} from './message.schema';
import { NotFoundError } from '../../errors/not-found.error';
import { ErrorCode } from '../../constants/error-codes';

export class MessageService {
  constructor(
    private chatSvc: ChatService = chatService,
    private messageRepo: IFirestoreRepository = getMessageRepository()
  ) {}

  /**
   * Requirement 2: Send Message
   * POST /chat/:chatId/message/send
   * Validates membership in relational DB, then persists message in Firestore.
   */
  async sendMessage(chatId: string, input: SendMessageInput) {
    // 1. Validate chat exists & sender is member in relational DB
    await this.chatSvc.validateMembership(chatId, input.senderId);

    // 2. Persist message in Firestore
    return this.messageRepo.createMessage({
      chatId,
      senderId: input.senderId,
      text: input.text,
    });
  }

  /**
   * Requirement 3: Get Messages
   * GET /chat/:chatId/messages?limit=50
   * Retrieves messages ordered chronologically from Firestore.
   */
  async getMessages(chatId: string, query: GetMessagesQuery) {
    // 1. Verify chat exists in relational DB
    await this.chatSvc.getChatById(chatId);

    // 2. Query Firestore with pagination limit and ordering
    return this.messageRepo.getMessages(chatId, {
      limit: query.limit,
      before: query.before,
    });
  }

  /**
   * Requirement 4: Mark Message Read
   * POST /chat/:chatId/message/:messageId/read
   * Updates read receipt in Firestore.
   */
  async markMessageRead(chatId: string, messageId: string, input: MarkMessageReadInput) {
    // 1. Validate chat exists & user is member
    await this.chatSvc.validateMembership(chatId, input.userId);

    // 2. Update read receipt atomically in Firestore
    return this.messageRepo.markMessageRead(chatId, messageId, input.userId);
  }

  /**
   * Requirement 5: Update Last Seen Message
   * POST /chat/:chatId/lastseen
   * Updates user's last seen message pointer in Firestore.
   */
  async updateLastSeen(chatId: string, input: UpdateLastSeenInput) {
    // 1. Validate chat exists & user is member
    await this.chatSvc.validateMembership(chatId, input.userId);

    // 2. Verify referenced message exists in this chat
    const message = await this.messageRepo.getMessageById(chatId, input.messageId);
    if (!message) {
      throw new NotFoundError(
        `Message '${input.messageId}' was not found in chat '${chatId}'`,
        ErrorCode.MESSAGE_NOT_FOUND
      );
    }

    // 3. Update last seen state in Firestore
    return this.messageRepo.updateLastSeen(chatId, input.userId, input.messageId);
  }

  /**
   * Retrieves last seen records for all members in a chat
   */
  async getLastSeen(chatId: string) {
    await this.chatSvc.getChatById(chatId);
    return this.messageRepo.getLastSeen(chatId);
  }

  /**
   * Bonus Feature: Edit message
   */
  async editMessage(chatId: string, messageId: string, input: EditMessageInput) {
    await this.chatSvc.validateMembership(chatId, input.senderId);
    return this.messageRepo.editMessage(chatId, messageId, input.senderId, input.text);
  }

  /**
   * Bonus Feature: Soft delete message
   */
  async deleteMessage(chatId: string, messageId: string, input: DeleteMessageInput) {
    await this.chatSvc.validateMembership(chatId, input.senderId);
    return this.messageRepo.deleteMessage(chatId, messageId, input.senderId);
  }
}

export const messageService = new MessageService();
