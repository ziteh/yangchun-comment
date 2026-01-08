import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { verifyAdminToken } from './utils';

const app = new Hono<{
  Bindings: {
    ADMIN_SECRET_KEY: string;
    ADMIN_USERNAME?: string;
    ADMIN_PASSWORD?: string;
  };
}>();

// Login endpoint
app.post('/login', async (c) => {
  const { username, password } = await c.req.json();

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

  return c.json({
    success: true,
    message: 'Login successful',
  });
});

// Logout endpoint
app.post('/logout', async (c) => {
  c.header('Set-Cookie', `admin_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);

  return c.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// Check authentication status
app.get('/check', async (c) => {
  const cookie = c.req.header('Cookie');
  const isValid = await verifyAdminToken(cookie, c.env.ADMIN_SECRET_KEY);
  if (isValid) {
    return c.json({ authenticated: true }, 200);
  }

  return c.json({ authenticated: false }, 401);
});

export default app;
