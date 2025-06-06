import { Hono } from 'hono';
import { validator } from 'hono/validator';
import Utils from './utils';
import type { Comment } from '@wonton-comment/shared';

const app = new Hono<{
  Bindings: {
    COMMENTS: KVNamespace;
    SECRET_KEY: string;
    MAX_NAME_LENGTH: number;
    MAX_MSG_LENGTH: number;
    POST_REGEX?: string;
  };
}>();

app.get('/', Utils.validateQueryPost, async (c) => {
  const { post } = c.req.valid('query');
  const key = Utils.getCommentKey(post);
  const raw = await c.env.COMMENTS.get(key);
  const comments = raw ? JSON.parse(raw) : [];

  return c.json(comments, 200); // 200 OK
});

app.post(
  '/',
  Utils.validateQueryPost,
  validator('json', (value, c) => {
    const { name, email, msg, replyTo, website } = value;

    // Honeypot check: if 'website' field is filled, it's likely a bot
    if (website) {
      // console.warn('Honeypot triggered from:', c.req.header('CF-Connecting-IP'));
      // Return 200 OK to fool bots, but don't actually process the comment
      return c.text('Comment received', 200);
    }

    if (!msg || typeof msg !== 'string') {
      return c.text('Missing or invalid msg field', 400);
    }

    if (msg.length > c.env.MAX_MSG_LENGTH) {
      return c.text(`Message is too long (maximum ${c.env.MAX_MSG_LENGTH} characters)`, 400);
    }

    if (name && typeof name === 'string' && name.length > c.env.MAX_NAME_LENGTH) {
      return c.text(`Name is too long (maximum ${c.env.MAX_NAME_LENGTH} characters)`, 400);
    }

    if (replyTo && (typeof replyTo !== 'string' || !/^[0-9A-Z]{12}$/.test(replyTo))) {
      return c.text('Invalid reply ID', 400);
    }

    return { name, email, msg, replyTo };
  }),
  async (c) => {
    const { post } = c.req.valid('query');
    const { name, email, msg, replyTo } = c.req.valid('json');

    const id = Utils.genId();
    const timestamp = Date.now();

    const comment: Comment = {
      id,
      name: Utils.sanitize(name),
      email: Utils.sanitize(email),
      msg: Utils.sanitize(msg),
      pubDate: timestamp,
      replyTo: replyTo,
    };

    // Save to KV
    const key = Utils.getCommentKey(post);
    const raw = await c.env.COMMENTS.get(key);
    const comments = raw ? JSON.parse(raw) : [];
    comments.push(comment);
    await c.env.COMMENTS.put(key, JSON.stringify(comments));

    const token = await Utils.genHmac(c.env.SECRET_KEY, id, timestamp);

    return c.json({ id, timestamp, token }, 201); // 201 Created
  },
);

app.put('/', Utils.validateQueryPost, async (c) => {
  const { post } = c.req.valid('query');
  const { id, timestamp, token, name, email, msg } = await c.req.json();

  if (!msg || typeof msg !== 'string') {
    console.warn('Invalid message for update:', msg);
    return c.text('Missing fields', 400); // 400 Bad Request
  }

  if (msg.length > c.env.MAX_MSG_LENGTH) {
    console.warn('Message too long for update:', msg.length);
    return c.text(`Message is too long (maximum ${c.env.MAX_MSG_LENGTH} characters)`, 400);
  }

  if (name && typeof name === 'string' && name.length > c.env.MAX_NAME_LENGTH) {
    console.warn('Name too long for update:', name.length);
    return c.text(`Name is too long (maximum ${c.env.MAX_NAME_LENGTH} characters)`, 400);
  }

  const hmacOk = await Utils.verifyHmac(c.env.SECRET_KEY, id, timestamp, token);
  if (!hmacOk) {
    console.warn('Invalid HMAC for update request:', id);
    return c.text('Invalid HMAC', 403); // 403 Forbidden
  }

  const key = Utils.getCommentKey(post);
  const raw = await c.env.COMMENTS.get(key);
  const comments: Comment[] = raw ? JSON.parse(raw) : [];
  const index = comments.findIndex((c) => c.id === id);
  if (index === -1) {
    console.warn('Comment not found for update:', id);
    return c.text('Comment not found', 404); // 404 Not Found
  }

  comments[index] = {
    ...comments[index],
    name: Utils.sanitize(name),
    email: Utils.sanitize(email),
    msg: Utils.sanitize(msg),
    modDate: Date.now(),
  };
  await c.env.COMMENTS.put(key, JSON.stringify(comments));
  return c.text('Comment updated', 200); // 200 OK
});

app.delete('/', Utils.validateQueryPost, async (c) => {
  const { post } = c.req.valid('query');
  const { id, timestamp, token } = await c.req.json();

  const hmacOk = await Utils.verifyHmac(c.env.SECRET_KEY, id, timestamp, token);
  if (!hmacOk) {
    console.warn('Invalid HMAC for delete request:', id);
    return c.text('Invalid HMAC', 403); // 403 Forbidden
  }

  const key = Utils.getCommentKey(post);
  const raw = await c.env.COMMENTS.get(key);
  const comments: Comment[] = raw ? JSON.parse(raw) : [];

  const index = comments.findIndex((c) => c.id === id);
  if (index === -1) {
    console.warn('Comment not found for deletion:', id);
    return c.text('Comment not found', 404); // 404 Not Found
  }

  // Instead of removing the comment, mark it as deleted
  comments[index] = {
    ...comments[index],
    name: 'deleted',
    email: 'deleted',
    msg: 'deleted',
    modDate: Date.now(),
  };

  await c.env.COMMENTS.put(key, JSON.stringify(comments));
  return c.text('Comment deleted', 200); // 200 OK
});

export default app;
