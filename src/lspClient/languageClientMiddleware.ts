import { CodeActionMiddleware } from './middlewares/codeActionMiddleware';
import { Middleware } from './middlewares/middleware';

/**
 * Middleware for {@link LanguageClientCreator}.
 */
export const LanguageClientMiddleware = {
  ...CodeActionMiddleware,
  ...Middleware,
} as const;
