import { z } from 'zod';

export const CreateDirectChatSchema = z
  .object({
    userAId: z.string().min(1, 'userAId is required'),
    userBId: z.string().min(1, 'userBId is required'),
  })
  .refine((data) => data.userAId !== data.userBId, {
    message: 'Cannot create a direct chat between the same user (self-chat not allowed)',
    path: ['userBId'],
  });

export const CreateGroupChatSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100),
  adminId: z.string().min(1, 'adminId is required'),
  memberIds: z.array(z.string().min(1)).min(1, 'At least one additional member is required'),
});

export const AddMemberSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

export const ChatIdParamSchema = z.object({
  chatId: z.string().min(1, 'chatId is required'),
});

export type CreateDirectChatInput = z.infer<typeof CreateDirectChatSchema>;
export type CreateGroupChatInput = z.infer<typeof CreateGroupChatSchema>;
export type AddMemberInput = z.infer<typeof AddMemberSchema>;
export type ChatIdParam = z.infer<typeof ChatIdParamSchema>;
