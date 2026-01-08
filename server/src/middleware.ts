import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { DEF } from './const';

const app = new Hono<{
  Bindings: {
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
    origin: c.env.CORS_ORIGIN || DEF.corsOrigin,
    allowHeaders: ['Content-Type', 'X-Comment-ID', 'X-Comment-Token', 'X-Comment-Timestamp'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
  });

  return corsMiddleware(c, next);
});

export default app;
