import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requestLogger } from './middlewares/request-logger.middleware';
import { notFoundHandler } from './middlewares/not-found.middleware';
import { errorHandler } from './middlewares/error-handler.middleware';
import { chatRoutes } from './modules/chat/chat.routes';
import { messageRoutes } from './modules/message/message.routes';
import { userRoutes } from './modules/user/user.routes';
import { ApiResponse } from './utils/api-response';

export function createApp(): Application {
  const app = express();

  // Security & standard middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // HTTP Request Logging
  app.use(requestLogger);

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    ApiResponse.success(
      res,
      {
        status: 'UP',
        timestamp: new Date().toISOString(),
        service: 'chat-backend',
        version: '1.0.0',
      },
      'Service is healthy'
    );
  });

  // API Routes
  // Chat endpoints: /chat/create, /chat/:chatId, /chat/:chatId/members, etc.
  app.use('/chat', chatRoutes);
  // Chat message endpoints: /chat/:chatId/message/send, /chat/:chatId/messages, /chat/:chatId/lastseen, etc.
  app.use('/chat', messageRoutes);
  // User endpoints: /user/:userId/chats, /user, etc.
  app.use('/user', userRoutes);

  // 404 Not Found Middleware
  app.use(notFoundHandler);

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}

export const app = createApp();
