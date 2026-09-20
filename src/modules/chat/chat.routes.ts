import { Router } from 'express';
import { chatController } from './chat.controller';
import { validateRequest } from '../../middlewares/validate.middleware';
import {
  CreateDirectChatSchema,
  CreateGroupChatSchema,
  AddMemberSchema,
  ChatIdParamSchema,
} from './chat.schema';

const router = Router();

// Requirement 1: Create or Get Chat
router.post(
  '/create',
  validateRequest({ body: CreateDirectChatSchema }),
  chatController.createOrGetChat
);

// Bonus: Create Group Chat
router.post(
  '/group/create',
  validateRequest({ body: CreateGroupChatSchema }),
  chatController.createGroupChat
);

// Bonus: Add member to chat
router.post(
  '/:chatId/members',
  validateRequest({ params: ChatIdParamSchema, body: AddMemberSchema }),
  chatController.addMember
);

// Get chat by ID
router.get(
  '/:chatId',
  validateRequest({ params: ChatIdParamSchema }),
  chatController.getChatById
);

export const chatRoutes = router;
