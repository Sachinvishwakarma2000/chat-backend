import { Request, Response, NextFunction } from 'express';
import { ChatService, chatService } from './chat.service';
import { ApiResponse } from '../../utils/api-response';
import { HttpStatus } from '../../constants/http-status';

export class ChatController {
  constructor(private chatSvc: ChatService = chatService) {}

  /**
   * Requirement 1: Create or Get Chat
   * POST /chat/create
   */
  createOrGetChat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.chatSvc.createOrGetDirectChat(req.body);
      const statusCode = result.isNew ? HttpStatus.CREATED : HttpStatus.OK;
      const message = result.isNew ? 'Direct chat created successfully' : 'Existing direct chat retrieved';

      ApiResponse.success(res, { chatId: result.chatId }, message, statusCode);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get chat by ID with member list
   * GET /chat/:chatId
   */
  getChatById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const chat = await this.chatSvc.getChatById(req.params.chatId);
      ApiResponse.success(res, chat);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Bonus Feature: Create group chat
   * POST /chat/group/create
   */
  createGroupChat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const groupChat = await this.chatSvc.createGroupChat(req.body);
      ApiResponse.created(res, { chatId: groupChat.id, groupChat }, 'Group chat created successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Bonus Feature: Add member to chat
   * POST /chat/:chatId/members
   */
  addMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const requesterId = req.headers['x-user-id'] as string || req.body.requesterId || req.body.adminId;
      const member = await this.chatSvc.addMemberToChat(
        req.params.chatId,
        requesterId,
        req.body
      );
      ApiResponse.created(res, member, 'Member added to chat successfully');
    } catch (error) {
      next(error);
    }
  };
}

export const chatController = new ChatController();
