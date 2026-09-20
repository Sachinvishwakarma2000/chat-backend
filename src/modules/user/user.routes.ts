import { Router } from 'express';
import { userController } from './user.controller';
import { validateRequest } from '../../middlewares/validate.middleware';
import { CreateUserSchema, UserIdParamSchema } from './user.schema';

const router = Router();

// List chats of a user (Requirement 6)
router.get(
  '/:userId/chats',
  validateRequest({ params: UserIdParamSchema }),
  userController.getUserChats
);

// Get single user by ID
router.get(
  '/:userId',
  validateRequest({ params: UserIdParamSchema }),
  userController.getUserById
);

// Create user
router.post(
  '/',
  validateRequest({ body: CreateUserSchema }),
  userController.createUser
);

// List all users
router.get('/', userController.getAllUsers);

export const userRoutes = router;
