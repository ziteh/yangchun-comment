import { env } from 'cloudflare:test';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import app from '../src/routes/comment';

vi.mock('../src/utils/crypto', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../src/utils/crypto')>();
  return {
    ...mod,
    verifyFormalPow: vi.fn().mockResolvedValue(true),
    verifyAdminToken: vi.fn().mockResolvedValue(false),
  };
});

vi.mock('../src/utils/validators', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../src/utils/validators')>();
  return {
    ...mod,
    validatePostUrl: vi.fn().mockResolvedValue(true),
  };
});

describe('Comment API', () => {
  beforeAll(async () => {
    // Initialize DB schema for testing
    await env.DB.exec(
      'CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY, post TEXT NOT NULL, pseudonym TEXT, msg TEXT NOT NULL, pub_date INTEGER NOT NULL, mod_date INTEGER, reply_to TEXT, is_admin INTEGER DEFAULT 0);',
    );
  });

  it('New comment and fetch', { retry: 3 }, async () => {
    const now = Date.now();
    const post = 'test-post';

    // POST a new comment
    // Note: targeting comment sub-app directly, so path is /
    const res = await app.request(
      `/?post=${post}&challenge=test-challenge&nonce=123`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:5173',
        },
        body: JSON.stringify({
          pseudonym: 'test-user',
          msg: 'Hello, this is a test comment',
        }),
      },
      env,
    );

    expect(res.status).toBe(201);

    const json = (await res.json()) as any;
    expect(json.id).toBeDefined();
    expect(json.id.length).toBe(12);
    expect(json.timestamp).toBeGreaterThanOrEqual(now);
    expect(json.token).toBeDefined();

    // GET comments for the post
    const res2 = await app.request(`/?post=${post}`, { method: 'GET' }, env);
    expect(res2.status).toBe(200);

    const json2 = (await res2.json()) as any;
    expect(json2.comments).toBeInstanceOf(Array);
    expect(json2.comments.length).toBe(1);
    expect(json2.isAdmin).toBe(false);

    const comment = json2.comments[0];
    expect(comment.pseudonym).toBe('test-user');
    expect(comment.msg).toBe('Hello, this is a test comment');
    expect(comment.id).toBe(json.id);
  });
});
