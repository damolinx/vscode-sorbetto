import { Middleware } from './middlewares/middleware';

/**
 * Middleware for {@link LanguageClientCreator}.
 */
export const LanguageClientMiddleware = {
  ...Middleware,
} as const;
