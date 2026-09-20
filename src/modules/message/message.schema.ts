import { z } from 'zod';

export const SendMessageSchema = z.object({
  senderId: z.string().min(1, 'senderId is required'),
  text: z.string().min(1, 'Message text cannot be empty').max(5000, 'Message text exceeds 5000 chars'),
});

export const GetMessagesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  before: z.string().optional(),
});

export const MarkMessageReadSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
});

export const UpdateLastSeenSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  messageId: z.string().min(1, 'messageId is required'),
});

export const EditMessageSchema = z.object({
  senderId: z.string().min(1, 'senderId is required'),
  text: z.string().min(1, 'Updated text cannot be empty').max(5000),
});

export const DeleteMessageSchema = z.object({
  senderId: z.string().min(1, 'senderId is required'),
});

export const ChatMessageParamsSchema = z.object({
  chatId: z.string().min(1, 'chatId is required'),
  messageId: z.string().min(1, 'messageId is required'),
});

export const ChatIdOnlyParamSchema = z.object({
  chatId: z.string().min(1, 'chatId is required'),
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type GetMessagesQuery = z.infer<typeof GetMessagesQuerySchema>;
export type MarkMessageReadInput = z.infer<typeof MarkMessageReadSchema>;
export type UpdateLastSeenInput = z.infer<typeof UpdateLastSeenSchema>;
export type EditMessageInput = z.infer<typeof EditMessageSchema>;
export type DeleteMessageInput = z.infer<typeof DeleteMessageSchema>;
