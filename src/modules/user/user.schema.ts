import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  avatarUrl: z.string().url('Avatar URL must be a valid URL').optional(),
});

export const UserIdParamSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UserIdParam = z.infer<typeof UserIdParamSchema>;
