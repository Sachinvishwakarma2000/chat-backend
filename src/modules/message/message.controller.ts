import { Request, Response, NextFunction } from 'express';
import { MessageService, messageService } from './message.service';
import { ApiResponse } from '../../utils/api-response';

export class MessageController {
  constructor(private messageSvc: MessageService = messageService) {}

  /**
   * Requirement 2: Send Message
   * POST /chat/:chatId/message/send
   */
  sendMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const message = await this.messageSvc.sendMessage(req.params.chatId, req.body);
      ApiResponse.created(res, message, 'Message sent successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Requirement 3: Get Messages
   * GET /chat/:chatId/messages?limit=50
   */
  getMessages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const messages = await this.messageSvc.getMessages(req.params.chatId, req.query as any);
      ApiResponse.success(
        res,
        messages,
        'Messages retrieved successfully',
        200,
        { count: messages.length }
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Requirement 4: Mark Message Read
   * POST /chat/:chatId/message/:messageId/read
   */
  markMessageRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const message = await this.messageSvc.markMessageRead(
        req.params.chatId,
        req.params.messageId,
        req.body
      );
      ApiResponse.success(res, message, 'Message marked as read');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Requirement 5: Update Last Seen Message
   * POST /chat/:chatId/lastseen
   */
  updateLastSeen = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lastSeen = await this.messageSvc.updateLastSeen(req.params.chatId, req.body);
      ApiResponse.success(res, lastSeen, 'Last seen updated successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get Last Seen information for chat
   * GET /chat/:chatId/lastseen
   */
  getLastSeen = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lastSeen = await this.messageSvc.getLastSeen(req.params.chatId);
      ApiResponse.success(res, lastSeen, 'Last seen information retrieved');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Bonus Feature: Edit message
   * PATCH /chat/:chatId/message/:messageId
   */
  editMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await this.messageSvc.editMessage(
        req.params.chatId,
        req.params.messageId,
        req.body
      );
      ApiResponse.success(res, updated, 'Message edited successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Bonus Feature: Delete message
   * DELETE /chat/:chatId/message/:messageId
   */
  deleteMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const deleted = await this.messageSvc.deleteMessage(
        req.params.chatId,
        req.params.messageId,
        req.body
      );
      ApiResponse.success(res, deleted, 'Message deleted successfully');
    } catch (error) {
      next(error);
    }
  };
}

export const messageController = new MessageController();
