import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono<{
  Bindings: {
    // Bindings
    RATE_LIMITER_POST: RateLimit;
    RATE_LIMITER_GET: RateLimit;

    // Environment variables
    CORS_ORIGIN: string;
  };
}>();

// CORS middleware
app.use('*', async (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.CORS_ORIGIN,
    allowHeaders: ['Content-Type'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
  });

  return corsMiddleware(c, next);
});

// Error handling middleware
app.onError((err, c) => {
  console.error(`${c.req.method} ${c.req.path} - Error:`, err);
  return c.text('Internal Server Error', 500); // 500 Internal Server Error
});

// Rate limiting middleware
app.use('*', async (c, next) => {
  // TODO not recommended to use IP
  const ip = c.req.header('CF-Connecting-IP') || '0.0.0.0';
  const isPost = c.req.method === 'POST';
  const limiter = isPost ? c.env.RATE_LIMITER_POST : c.env.RATE_LIMITER_GET;
  const { success } = await limiter.limit({ key: ip });

  if (!success) {
    return c.text('Rate limit exceeded', 429); // 429 Too Many Requests
  }

  await next();
});

export default app;
