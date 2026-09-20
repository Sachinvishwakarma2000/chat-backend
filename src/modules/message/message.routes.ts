import { Router } from 'express';
import { messageController } from './message.controller';
import { validateRequest } from '../../middlewares/validate.middleware';
import {
  SendMessageSchema,
  GetMessagesQuerySchema,
  MarkMessageReadSchema,
  UpdateLastSeenSchema,
  EditMessageSchema,
  DeleteMessageSchema,
  ChatMessageParamsSchema,
  ChatIdOnlyParamSchema,
} from './message.schema';

const router = Router();

// Requirement 2: Send Message (POST /chat/:chatId/message/send)
router.post(
  '/:chatId/message/send',
  validateRequest({ params: ChatIdOnlyParamSchema, body: SendMessageSchema }),
  messageController.sendMessage
);

// Requirement 3: Get Messages (GET /chat/:chatId/messages?limit=50)
router.get(
  '/:chatId/messages',
  validateRequest({ params: ChatIdOnlyParamSchema, query: GetMessagesQuerySchema }),
  messageController.getMessages
);

// Requirement 4: Mark Message Read (POST /chat/:chatId/message/:messageId/read)
router.post(
  '/:chatId/message/:messageId/read',
  validateRequest({ params: ChatMessageParamsSchema, body: MarkMessageReadSchema }),
  messageController.markMessageRead
);

// Requirement 5: Update Last Seen Message (POST /chat/:chatId/lastseen)
router.post(
  '/:chatId/lastseen',
  validateRequest({ params: ChatIdOnlyParamSchema, body: UpdateLastSeenSchema }),
  messageController.updateLastSeen
);

// Get Last Seen records for a chat
router.get(
  '/:chatId/lastseen',
  validateRequest({ params: ChatIdOnlyParamSchema }),
  messageController.getLastSeen
);

// Bonus: Edit Message (PATCH /chat/:chatId/message/:messageId)
router.patch(
  '/:chatId/message/:messageId',
  validateRequest({ params: ChatMessageParamsSchema, body: EditMessageSchema }),
  messageController.editMessage
);

// Bonus: Delete Message (DELETE /chat/:chatId/message/:messageId)
router.delete(
  '/:chatId/message/:messageId',
  validateRequest({ params: ChatMessageParamsSchema, body: DeleteMessageSchema }),
  messageController.deleteMessage
);

export const messageRoutes = router;
