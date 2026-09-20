import { ChatRepository, chatRepository } from './chat.repository';
import { UserRepository, userRepository } from '../user/user.repository';
import { CreateDirectChatInput, CreateGroupChatInput, AddMemberInput } from './chat.schema';
import { NotFoundError } from '../../errors/not-found.error';
import { BadRequestError } from '../../errors/bad-request.error';
import { ForbiddenError } from '../../errors/forbidden.error';
import { ConflictError } from '../../errors/conflict.error';
import { ErrorCode } from '../../constants/error-codes';
import { MemberRole } from '@prisma/client';

export class ChatService {
  constructor(
    private chatRepo: ChatRepository = chatRepository,
    private userRepo: UserRepository = userRepository
  ) {}

  /**
   * Requirement 1: Create or Get Chat
   * POST /chat/create
   * Input: userAId, userBId
   * Output: { chatId: string, isNew?: boolean }
   */
  async createOrGetDirectChat(input: CreateDirectChatInput): Promise<{ chatId: string; isNew: boolean }> {
    const { userAId, userBId } = input;

    if (userAId === userBId) {
      throw new BadRequestError(
        'Cannot create a direct chat with yourself',
        ErrorCode.SELF_CHAT_NOT_ALLOWED
      );
    }

    // 1. Verify both users exist
    const [userA, userB] = await Promise.all([
      this.userRepo.findById(userAId),
      this.userRepo.findById(userBId),
    ]);

    if (!userA) {
      throw new NotFoundError(`User with ID '${userAId}' does not exist`, ErrorCode.USER_NOT_FOUND);
    }
    if (!userB) {
      throw new NotFoundError(`User with ID '${userBId}' does not exist`, ErrorCode.USER_NOT_FOUND);
    }

    // 2. Check if a direct chat between these two users already exists
    const existingChat = await this.chatRepo.findDirectChatBetweenUsers(userAId, userBId);
    if (existingChat) {
      return {
        chatId: existingChat.id,
        isNew: false,
      };
    }

    // 3. Create new direct chat
    const newChat = await this.chatRepo.createDirectChat(userAId, userBId);
    return {
      chatId: newChat.id,
      isNew: true,
    };
  }

  /**
   * Retrieves chat details along with member list
   */
  async getChatById(chatId: string) {
    const chat = await this.chatRepo.findById(chatId);
    if (!chat) {
      throw new NotFoundError(`Chat with ID '${chatId}' was not found`, ErrorCode.CHAT_NOT_FOUND);
    }
    return chat;
  }

  /**
   * Ensures the chat exists and the specified user is an authorized member
   */
  async validateMembership(chatId: string, userId: string): Promise<void> {
    const chat = await this.chatRepo.findById(chatId);
    if (!chat) {
      throw new NotFoundError(`Chat with ID '${chatId}' was not found`, ErrorCode.CHAT_NOT_FOUND);
    }

    const isMember = await this.chatRepo.isUserMemberOfChat(chatId, userId);
    if (!isMember) {
      throw new ForbiddenError(
        `User '${userId}' is not a member of chat '${chatId}'`,
        ErrorCode.NOT_CHAT_MEMBER
      );
    }
  }

  /**
   * Bonus Feature: Create a group chat
   */
  async createGroupChat(input: CreateGroupChatInput) {
    const { name, adminId, memberIds } = input;

    // Verify admin exists
    const admin = await this.userRepo.findById(adminId);
    if (!admin) {
      throw new NotFoundError(`Admin user '${adminId}' not found`, ErrorCode.USER_NOT_FOUND);
    }

    return this.chatRepo.createGroupChat(name, adminId, memberIds);
  }

  /**
   * Bonus Feature: Add a member to a group chat
   */
  async addMemberToChat(chatId: string, requesterId: string, input: AddMemberInput) {
    await this.validateMembership(chatId, requesterId);

    const targetUser = await this.userRepo.findById(input.userId);
    if (!targetUser) {
      throw new NotFoundError(`User '${input.userId}' not found`, ErrorCode.USER_NOT_FOUND);
    }

    const isAlreadyMember = await this.chatRepo.isUserMemberOfChat(chatId, input.userId);
    if (isAlreadyMember) {
      throw new ConflictError(
        `User '${input.userId}' is already a member of this chat`,
        ErrorCode.CONFLICT_ERROR
      );
    }

    return this.chatRepo.addMember(chatId, input.userId, input.role as MemberRole);
  }
}

export const chatService = new ChatService();
