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
          pseudonym: 'test',
          nameHash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
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
    expect(json.timestamp).toBeGreaterThanOrEqual(now);

    const res2 = await app.request(`/?post=${post}`, { method: 'GET' }, env);
    expect(res2.status).toBe(200);

    const json2 = await res2.json();
    if (!Array.isArray(json2)) assert.fail();
    expect(json2.length).toBe(1);
    if (!isComment(json2[0])) assert.fail();

    expect(json2[0].pseudonym).toBe('test');
    expect(json2[0].msg).toBe('Hello');
  });
});
