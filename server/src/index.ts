import { Hono } from 'hono';
import { env } from 'cloudflare:workers';
import middleware from './routes/middleware';
import comments from './routes/comment';
import rss from './routes/rss';
import admin from './routes/admin';
import pow from './routes/pow';
import { HTTP_STATUS } from './const';
import { z } from 'zod';

// Environment variables
const envSchema = z.object({
  // Normal
  FRONTEND_URL: z.url(),
  POST_BASE_URL: z.url().optional(),
  CORS_ORIGIN: z.url(),
  RSS_SITE_PATH: z.string(),
  ADMIN_USERNAME: z.string(),
  COOKIE_SAME_SITE: z.enum(['Strict', 'Lax', 'None']),
  ADMIN_MAX_LOGIN_ATTEMPTS: z.coerce.number().min(1).max(50),
  ADMIN_SESSION_DURATION: z.coerce.number().min(60),
  ADMIN_LOGIN_FAIL_WINDOW: z.coerce.number().min(60),
  ADMIN_IP_BLOCK_DURATION: z.coerce.number().min(60),
  MAX_ALL_SITE_RSS_COMMENTS: z.coerce.number().min(1),
  MAX_THREAD_RSS_COMMENTS: z.coerce.number().min(1),
  PRE_POW_DIFFICULTY: z.coerce.number().min(1),
  PRE_POW_TIME_WINDOW: z.coerce.number().min(1),
  PRE_POW_MAGIC_WORD: z.string().min(1),
  FORMAL_POW_DIFFICULTY: z.coerce.number().min(1),
  FORMAL_POW_EXPIRATION: z.coerce.number().min(1),

  // Secrets
  // 64 hex characters = 32 bytes
  SECRET_ADMIN_PASSWORD_HASH: z.hex().min(64),
  SECRET_ADMIN_PASSWORD_SALT: z.hex().min(64),
  SECRET_ADMIN_JWT_KEY: z.hex().min(64),
  SECRET_COMMENT_HMAC_KEY: z.hex().min(64),
  SECRET_FORMAL_POW_HMAC_KEY: z.hex().min(64),
  SECRET_IP_PEPPER: z.hex().min(64),
  SECRET_DISCORD_WEBHOOK_URL: z.url().optional(),
});
const envResult = envSchema.safeParse(env);
if (!envResult.success) {
  console.error('Environment variable validation failed:', z.treeifyError(envResult.error));
  throw new Error('Environment variable validation failed');
}

const app = new Hono();

// Error handling
app.onError((err, c) => {
  console.error(`${c.req.method} ${c.req.path} - Error:`, err);
  return c.text('Internal Server Error', HTTP_STATUS.InternalServerError);
});

app.route('/', middleware);
app.route('/api/pow', pow);
app.route('/api/comments', comments);
app.route('/rss', rss);
app.route('/admin', admin);

export default app;
