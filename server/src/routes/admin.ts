import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { sValidator } from '@hono/standard-validator';
import { sign, verify } from 'hono/jwt';
import {
  AdminLoginRequestSchema,
  AdminLoginResponseSchema,
  AdminLogoutResponseSchema,
  AdminCheckResponseSchema,
} from '@ziteh/yangchun-comment-shared';
import { verifyAdminToken, constantTimeCompare, hmacSha256 } from '../utils/crypto';
import { incrementLoginFailCount, clearLoginFailCount } from '../utils/db';

const app = new Hono<{
  Bindings: {
    DB: D1Database;
    KV: KVNamespace;
    ADMIN_SECRET_KEY: string;
    ADMIN_USERNAME: string;
    ADMIN_PASSWORD: string;
    IP_PEPPER: string;
  };
}>();

// Login endpoint
app.post('/login', sValidator('json', AdminLoginRequestSchema), async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || '0.0.0.0';
  const ipMac = await hmacSha256(ip, c.env.IP_PEPPER);

  const blockedKey = `blocked_ip:${ipMac}`;
  const isBlocked = await c.env.KV.get(blockedKey);
  if (isBlocked) {
    return c.text('Too many attempts', 429); // 429 Too Many Requests
  }

  // HACK: Normally, stored passwords should be processed using hash+salt (e.g. Argon2 or bcrypt).
  // Currently, the admin password is stored using CF Secrets,
  // which is designed for storing sensitive data.
  // Values are not visible within Wrangler or CF dashboard after you define them.
  // https://developers.cloudflare.com/workers/configuration/secrets/
  const adminUsername = c.env.ADMIN_USERNAME;
  const adminPassword = c.env.ADMIN_PASSWORD;
  const { username, password } = c.req.valid('json');
  const usernameMatch = await constantTimeCompare(username, adminUsername);
  const passwordMatch = await constantTimeCompare(password, adminPassword);
  if (!usernameMatch || !passwordMatch) {
    const failCount = await incrementLoginFailCount(c.env.DB, ipMac, 3600); // TODO: magic number
    if (failCount > 5) {
      // TODO: magic number
      // Block IP
      await c.env.KV.put(blockedKey, '1', { expirationTtl: 3600 }); // TODO: magic number
      console.error('IP blocked due to repeated failed login attempts:', ipMac);
    } else {
      console.warn('Failed login attempt:', ipMac, `(${failCount}/5)`);
    }

    // Random delay to mitigate timing attacks
    await new Promise((r) => setTimeout(r, Math.random() * 1000 + 500));
    return c.text('Authentication failed', 401); // 401 Unauthorized
  }

  // Clear fail count on successful login
  await clearLoginFailCount(c.env.DB, ipMac);

  // JWT token
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    username: username,
    role: 'admin',
    iat: now,
    exp: now + 3600, // TODO: magic number
    jti: crypto.randomUUID(),
  };
  const token = await sign(payload, c.env.ADMIN_SECRET_KEY);

  // Set HttpOnly cookie
  setCookie(c, 'admin_token', token, {
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'Strict',
    maxAge: 3600, // TODO: magic number
  });

  console.info('Successful login');
  const res = AdminLoginResponseSchema.parse({
    success: true,
    message: 'Login successful',
  });
  return c.json(res);
});

// Logout endpoint
app.post('/logout', async (c) => {
  // Add JWT to JTI blacklist
  const cookie = c.req.header('Cookie');
  if (cookie) {
    const match = cookie.match(/admin_token=([^;]+)/);
    if (match) {
      const token = match[1];
      try {
        const payload = await verify(token, c.env.ADMIN_SECRET_KEY);
        if (payload.jti && payload.exp) {
          const jtiKey = `jti_blacklist:${payload.jti}`;
          const ttl = payload.exp - Math.floor(Date.now() / 1000);
          if (ttl > 0) {
            await c.env.KV.put(jtiKey, '1', { expirationTtl: ttl });
          }
        }
      } catch {
        // Ignore invalid tokens
      }
    }
  }

  setCookie(c, 'admin_token', '', {
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'Strict',
    maxAge: 0, // Expire immediately
  });

  const response = AdminLogoutResponseSchema.parse({
    success: true,
    message: 'Logged out successfully',
  });
  return c.json(response);
});

// Check authentication status
app.get('/check', async (c) => {
  const cookie = c.req.header('Cookie');
  const isValid = await verifyAdminToken(cookie, c.env.ADMIN_SECRET_KEY, c.env.KV);

  const response = AdminCheckResponseSchema.parse({ authenticated: isValid });
  const status = isValid ? 200 : 401;
  return c.json(response, status);
});

export default app;
