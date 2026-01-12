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
import { verifyAdminToken, constantTimeCompare, hmacSha256, verifyPassword } from '../utils/crypto';
import { incrementLoginFailCount, clearLoginFailCount } from '../utils/db';
import { HTTP_STATUS } from '../const';

const app = new Hono<{
  Bindings: {
    DB: D1Database;
    KV: KVNamespace;
    COOKIE_SAME_SITE: string;
    ADMIN_USERNAME: string;
    ADMIN_SESSION_DURATION: number;
    ADMIN_MAX_LOGIN_ATTEMPTS: number;
    ADMIN_LOGIN_FAIL_WINDOW: number;
    ADMIN_IP_BLOCK_DURATION: number;
    SECRET_ADMIN_PASSWORD_HASH: string;
    SECRET_ADMIN_PASSWORD_SALT: string;
    SECRET_ADMIN_JWT_KEY: string;
    SECRET_IP_PEPPER: string;
  };
}>();

// Login endpoint
app.post('/login', sValidator('json', AdminLoginRequestSchema), async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || '0.0.0.0';
  const ipHash = await hmacSha256(ip, c.env.SECRET_IP_PEPPER);

  const blockedKey = `blocked_ip:${ipHash}`;
  const isBlocked = await c.env.KV.get(blockedKey);
  if (isBlocked) {
    return c.text('Too many attempts', HTTP_STATUS.TooManyRequests);
  }

  const adminUsername = c.env.ADMIN_USERNAME;
  const adminPasswordHash = c.env.SECRET_ADMIN_PASSWORD_HASH;
  const adminPasswordSalt = c.env.SECRET_ADMIN_PASSWORD_SALT;
  const { username, password } = c.req.valid('json');

  const usernameMatch = await constantTimeCompare(username, adminUsername);
  const passwordMatch = await verifyPassword(password, adminPasswordSalt, adminPasswordHash);
  if (!usernameMatch || !passwordMatch) {
    const loginFailWindow = c.env.ADMIN_LOGIN_FAIL_WINDOW;
    const maxLoginAttempts = c.env.ADMIN_MAX_LOGIN_ATTEMPTS;
    const ipBlockDuration = c.env.ADMIN_IP_BLOCK_DURATION;

    const failCount = await incrementLoginFailCount(c.env.DB, ipHash, loginFailWindow);
    if (failCount > maxLoginAttempts) {
      // Block IP
      await c.env.KV.put(blockedKey, '1', { expirationTtl: ipBlockDuration });
      console.error('IP blocked due to repeated failed login attempts:', ipHash);
    } else {
      console.warn('Failed login attempt:', ipHash, `(${failCount}/${maxLoginAttempts})`);
    }

    // Random delay to mitigate timing attacks
    await new Promise((r) => setTimeout(r, Math.random() * 1000 + 500));
    return c.text('Authentication failed', HTTP_STATUS.Unauthorized);
  }

  // Clear fail count on successful login
  await clearLoginFailCount(c.env.DB, ipHash);

  // JWT token
  const sessionDuration = c.env.ADMIN_SESSION_DURATION;
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    username: username,
    role: 'admin',
    iat: now,
    exp: now + sessionDuration,
    jti: crypto.randomUUID(),
  };
  const token = await sign(payload, c.env.SECRET_ADMIN_JWT_KEY);

  setCookie(c, 'admin_token', token, {
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: c.env.COOKIE_SAME_SITE as 'Strict' | 'Lax' | 'None',
    maxAge: sessionDuration,
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
        const payload = await verify(token, c.env.SECRET_ADMIN_JWT_KEY);
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
    sameSite: c.env.COOKIE_SAME_SITE as 'Strict' | 'Lax' | 'None',
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
  const isValid = await verifyAdminToken(cookie, c.env.SECRET_ADMIN_JWT_KEY, c.env.KV);

  const response = AdminCheckResponseSchema.parse({ authenticated: isValid });
  const status = isValid ? HTTP_STATUS.Ok : HTTP_STATUS.Unauthorized;
  return c.json(response, status);
});

export default app;
