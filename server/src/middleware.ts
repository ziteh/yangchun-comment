import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { hashFnv1a } from './utils';

const app = new Hono<{
  Bindings: {
    // Bindings
    RATE_LIMITER_POST: RateLimit;
    RATE_LIMITER_GET: RateLimit;

    // Environment variables
    CORS_ORIGIN: string;
    POST_REGEX?: string;
  };
}>();

// Origin / Referer header
app.use('*', async (c, next) => {
  const method = c.req.method;

  // Skip verification for GET and OPTIONS
  if (method === 'GET' || method === 'OPTIONS') {
    return next();
  }

  const origin = c.req.header('Origin');
  const referer = c.req.header('Referer');
  if (!origin && !referer) {
    console.warn(`Blocked request without Origin/Referer: ${c.req.method} ${c.req.path}`);
    return c.text('Forbidden', 403); // 403 Forbidden
  }

  return next();
});

// CORS middleware
app.use('*', async (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.CORS_ORIGIN || '*',
    allowHeaders: ['Content-Type', 'X-Comment-ID', 'X-Comment-Token', 'X-Comment-Timestamp'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
  });

  return corsMiddleware(c, next);
});

// Rate limiting middleware
app.use('*', async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') || '0.0.0.0';
  const hashedIP = hashFnv1a(ip); // Don't store raw IPs
  const isPost = c.req.method === 'POST';
  const limiter = isPost ? c.env.RATE_LIMITER_POST : c.env.RATE_LIMITER_GET;
  const { success } = await limiter.limit({ key: hashedIP });

  if (!success) {
    console.warn(
      `Rate limit exceeded for hashed IP: ${hashedIP}, method: ${c.req.method}, path: ${c.req.path}`,
    );
    return c.text('Rate limit exceeded', 429); // 429 Too Many Requests
  }

  await next();
});

export default app;
