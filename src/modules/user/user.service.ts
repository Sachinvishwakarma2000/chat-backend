import { UserRepository, userRepository } from './user.repository';
import { CreateUserInput } from './user.schema';
import { NotFoundError } from '../../errors/not-found.error';
import { ConflictError } from '../../errors/conflict.error';
import { ErrorCode } from '../../constants/error-codes';

export class UserService {
  constructor(private userRepo: UserRepository = userRepository) {}

  async createUser(data: CreateUserInput) {
    const existing = await this.userRepo.findByEmail(data.email);
    if (existing) {
      throw new ConflictError(
        `User with email '${data.email}' already exists`,
        ErrorCode.CONFLICT_ERROR
      );
    }
    return this.userRepo.create(data);
  }

  async getUserById(id: string) {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundError(`User with ID '${id}' not found`, ErrorCode.USER_NOT_FOUND);
    }
    return user;
  }

  async getAllUsers() {
    return this.userRepo.findMany();
  }

  /**
   * Requirement 6: List User Chats
   * GET /user/:userId/chats
   * Output: List of chats with member IDs from relational DB
   */
  async getUserChats(userId: string) {
    // 1. Verify user exists
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError(`User with ID '${userId}' not found`, ErrorCode.USER_NOT_FOUND);
    }

    // 2. Fetch chats with membership data
    const chats = await this.userRepo.getUserChatsWithMembers(userId);

    // 3. Format response cleanly with member IDs and member summaries
    return chats.map((chat) => ({
      chatId: chat.id,
      type: chat.type,
      name: chat.name,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      memberIds: chat.members.map((m) => m.userId),
      members: chat.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    }));
  }
}

export const userService = new UserService();
