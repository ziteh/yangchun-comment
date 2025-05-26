import { Hono } from 'hono';
import Utils from './utils';
import type { Comment } from './model';

const app = new Hono<{
  Bindings: {
    COMMENTS: KVNamespace;
  };
}>();

app.get('/', Utils.validateQueryPost, async (c) => {
  const { post } = c.req.valid('query');
  const key = Utils.getCommentKey(post);
  const raw = await c.env.COMMENTS.get(key);
  const comments = raw ? JSON.parse(raw) : [];

  return c.json(comments, 200); // 200 OK
});

app.post('/', Utils.validateQueryPost, async (c) => {
  const { post } = c.req.valid('query');
  const { name, email, msg } = await c.req.json(); // TODO Validate and sanitize input

  if (!msg) {
    return c.text('Missing fields', 400); // 400 Bad Request
  }

  const id = Utils.genId();

  const comment: Comment = {
    id,
    name: Utils.sanitize(name),
    email: Utils.sanitize(email),
    msg: Utils.sanitize(msg),
    pubDate: Date.now(),
  };

  // Save to KV
  const key = Utils.getCommentKey(post);
  const raw = await c.env.COMMENTS.get(key);
  const comments = raw ? JSON.parse(raw) : [];
  comments.push(comment);
  await c.env.COMMENTS.put(key, JSON.stringify(comments));

  return c.json({ id }, 201); // 201 Created
});

export default app;
