import { env } from 'cloudflare:test';
import { describe, it, expect, assert } from 'vitest';
import app from '../src/comment';
import { isComment } from '@wonton-comment/shared';

describe('Comment', () => {
  it('New comment', async () => {
    const now = Date.now();
    const post = 'test-post';

    const res = await app.request(
      `/?post=${post}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Bob',
          msg: 'Hello',
        }),
      },
      env,
    );

    expect(res.status).toBe(201);

    const json = await res.json();

    if (typeof json !== 'object' || json === null) assert.fail();
    if (!('id' in json) || typeof json.id !== 'string') assert.fail();
    if (!('timestamp' in json) || typeof json.timestamp !== 'number') assert.fail();
    if (!('token' in json) || typeof json.token !== 'string') assert.fail();

    expect(json.id.length).toBe(12);
    expect(json.timestamp).toBeGreaterThan(now);

    const res2 = await app.request(`/?post=${post}`, { method: 'GET' }, env);
    expect(res2.status).toBe(200);

    const json2 = await res2.json();
    if (!Array.isArray(json2)) assert.fail();
    expect(json2.length).toBe(1);
    if (!isComment(json2[0])) assert.fail();

    expect(json2[0].name).toBe('Bob');
    expect(json2[0].msg).toBe('Hello');
  });
});
