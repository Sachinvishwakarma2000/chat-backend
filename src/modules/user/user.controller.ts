import { Request, Response, NextFunction } from 'express';
import { UserService, userService } from './user.service';
import { ApiResponse } from '../../utils/api-response';

export class UserController {
  constructor(private userSvc: UserService = userService) {}

  createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.userSvc.createUser(req.body);
      ApiResponse.created(res, user, 'User created successfully');
    } catch (error) {
      next(error);
    }
  };

  getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.userSvc.getUserById(req.params.userId);
      ApiResponse.success(res, user);
    } catch (error) {
      next(error);
    }
  };

  getAllUsers = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const users = await this.userSvc.getAllUsers();
      ApiResponse.success(res, users);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Requirement 6: List User Chats
   * GET /user/:userId/chats
   */
  getUserChats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const chats = await this.userSvc.getUserChats(req.params.userId);
      ApiResponse.success(res, chats, 'User chats retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}

export const userController = new UserController();
