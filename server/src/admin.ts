import { Hono } from 'hono';
import { sValidator } from '@hono/standard-validator';
import { sign } from 'hono/jwt';
import { verifyAdminToken } from './utils';
import {
  AdminLoginRequestSchema,
  AdminLoginResponseSchema,
  AdminLogoutResponseSchema,
  AdminCheckResponseSchema,
} from '@ziteh/yangchun-comment-shared';

const app = new Hono<{
  Bindings: {
    ADMIN_SECRET_KEY: string;
    ADMIN_USERNAME?: string;
    ADMIN_PASSWORD?: string;
  };
}>();

// Login endpoint
app.post('/login', sValidator('json', AdminLoginRequestSchema), async (c) => {
  const { username, password } = c.req.valid('json');

  // TODO: Use hash+salt password?
  const adminUsername = c.env.ADMIN_USERNAME;
  const adminPassword = c.env.ADMIN_PASSWORD;
  if (username !== adminUsername || password !== adminPassword) {
    return c.json({ error: 'Invalid username or password' }, 401);
  }

  // JWT token
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    username: username,
    role: 'admin',
    iat: now,
    exp: now + 1 * 60 * 60, // 1 hour later
  };
  const token = await sign(payload, c.env.ADMIN_SECRET_KEY);

  // Set httpOnly cookie
  c.header(
    'Set-Cookie',
    `admin_token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${1 * 60 * 60}`, // TODO: adjust Max-Age as needed
  );

  const response = AdminLoginResponseSchema.parse({
    success: true,
    message: 'Login successful',
  });
  return c.json(response);
});

// Logout endpoint
app.post('/logout', async (c) => {
  c.header('Set-Cookie', `admin_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);

  const response = AdminLogoutResponseSchema.parse({
    success: true,
    message: 'Logged out successfully',
  });
  return c.json(response);
});

// Check authentication status
app.get('/check', async (c) => {
  const cookie = c.req.header('Cookie');
  const isValid = await verifyAdminToken(cookie, c.env.ADMIN_SECRET_KEY);

  const response = AdminCheckResponseSchema.parse({ authenticated: isValid });
  const status = isValid ? 200 : 401;
  return c.json(response, status);
});

export default app;
