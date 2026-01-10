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
  CORS_ORIGIN: z.string(),
  RSS_SITE_PATH: z.string(),
  ADMIN_USERNAME: z.string(),
  MAX_ALL_SITE_RSS_COMMENTS: z.number().min(1),
  MAX_THREAD_RSS_COMMENTS: z.number().min(1),
  PRE_POW_DIFFICULTY: z.number().min(1),
  PRE_POW_TIME_WINDOW: z.number().min(1),
  PRE_POW_MAGIC_WORD: z.string().min(1),
  FORMAL_POW_DIFFICULTY: z.number().min(1),
  FORMAL_POW_EXPIRATION: z.number().min(1),

  // Secrets
  // 64 hex characters = 256 bits
  SECRET_COMMENT_HMAC_KEY: z.string().min(64),
  SECRET_ADMIN_JWT_KEY: z.string().min(64),
  ADMIN_PASSWORD: z.string().min(1),
  SECRET_FORMAL_POW_HMAC_KEY: z.string().min(64),
  SECRET_IP_PEPPER: z.string().min(64),
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
