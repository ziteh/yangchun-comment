import { Hono } from 'hono';
import { sValidator } from '@hono/standard-validator';
import { genId, getCommentKey } from '../utils/helpers';
import { CONSTANTS } from '../const';
import {
  type Comment,
  CreateCommentRequestSchema,
  UpdateCommentRequestSchema,
  GetCommentsResponseSchema,
  CreateCommentResponseSchema,
  CreateCommentQuerySchema,
  CommentAuthHeadersSchema,
  CommentQuerySchema,
} from '@ziteh/yangchun-comment-shared';
import { genHmac, verifyAdminToken, verifyFormalPow, verifyHmac } from '../utils/crypto';
import { validatePostUrl } from '../utils/validators';
import { sanitize } from '../utils/sanitize';

const app = new Hono<{
  Bindings: {
    COMMENTS: KVNamespace;
    HMAC_SECRET_KEY: string;
    POST_REGEX?: string;
    POST_BASE_URL: string;
    FORMAL_POW_SECRET_KEY: string;
    PRE_POW_DIFFICULTY: number;
    PRE_POW_MAGIC_WORD: string;
    PRE_POW_TIME_WINDOW: number;
    FORMAL_POW_DIFFICULTY: number;
    FORMAL_POW_EXPIRATION: number;
    ADMIN_SECRET_KEY: string;
  };
}>();

// Get comments for a post
app.get('/', sValidator('query', CommentQuerySchema), async (c) => {
  const { post } = c.req.query();
  const key = getCommentKey(post);
  const raw = await c.env.COMMENTS.get(key);
  const comments = raw ? JSON.parse(raw) : [];

  // Check admin auth status
  const cookie = c.req.header('Cookie');
  const isAdmin = await verifyAdminToken(cookie, c.env.ADMIN_SECRET_KEY, c.env.COMMENTS);

  console.debug(`Fetched ${comments.length} comments for post: ${post}, admin: ${isAdmin}`);
  const res = GetCommentsResponseSchema.parse({ comments, isAdmin });
  return c.json(res, 200); // 200 OK
});

// Create a new comment
app.post(
  '/',
  sValidator('query', CreateCommentQuerySchema),
  sValidator('json', CreateCommentRequestSchema),
  async (c) => {
    const { pseudonym, msg, replyTo, email } = c.req.valid('json');
    const { challenge, nonce, post } = c.req.valid('query');

    // Honeypot check, if 'email' present, it's likely a bot
    if (email) {
      return c.text('Comment received', 200); // 200 OK, fool the bot but do nothing
    }

    // Verify Formal-PoW
    const nonceNum = parseInt(nonce, 10);
    const powPass = await verifyFormalPow(challenge, post, nonceNum, c.env.FORMAL_POW_SECRET_KEY);
    if (!powPass) {
      console.warn('Formal-PoW verification failed');
      return c.text('Formal-PoW verification failed', 400); // 400 Bad Request
    }

    // Reject any suspicious pseudonyms
    const cleanPseudonym = pseudonym ? sanitize(pseudonym) : undefined;
    if (pseudonym && cleanPseudonym !== pseudonym) {
      return c.text('Pseudonym is invalid', 400); // 400 Bad Request
    }

    // Reject any suspicious message content
    const cleanMsg = sanitize(msg);
    if (cleanMsg.length === 0) {
      return c.text('Message is invalid', 400); // 400 Bad Request
    }

    const key = getCommentKey(post);
    const rawComments = await c.env.COMMENTS.get(key);
    if (!rawComments) {
      // No comments yet for this post
      const baseUrl = c.env.POST_BASE_URL;
      if (baseUrl) {
        // Validate the post URL if POST_BASE_URL is set
        const fullUrl = `${baseUrl}${post}`;
        const isValidPost = await validatePostUrl(fullUrl, 5000);
        if (!isValidPost) {
          console.warn(`No comments found for post: ${post}, invalid post`);
          return c.text('Invalid post', 400); // 400 Bad Request
        }
      }
    }
    const id = genId();
    const timestamp = Date.now();

    // Check if the request is from an admin
    const cookieHeader = c.req.header('Cookie');
    const isAdmin = await verifyAdminToken(cookieHeader, c.env.ADMIN_SECRET_KEY, c.env.COMMENTS);

    const comment: Comment = {
      id,
      pseudonym,
      msg,
      replyTo,
      pubDate: timestamp,
      ...(isAdmin && { isAdmin: true }),
    };

    // Save to KV
    const comments = rawComments ? JSON.parse(rawComments) : [];
    comments.push(comment);
    await c.env.COMMENTS.put(key, JSON.stringify(comments));
    const token = await genHmac(c.env.HMAC_SECRET_KEY, id, timestamp);

    console.log(`Comment created with ID: ${id} for post: ${post}`);
    const res = CreateCommentResponseSchema.parse({ id, timestamp, token });
    return c.json(res, 201); // 201 Created
  },
);

// Update a comment
app.put(
  '/',
  sValidator('query', CommentQuerySchema),
  sValidator('json', UpdateCommentRequestSchema),
  sValidator('header', CommentAuthHeadersSchema),
  async (c) => {
    const { post } = c.req.valid('query');
    const { pseudonym, msg } = c.req.valid('json'); // TODO: pseudonym is not editable currently, remove it?
    const headers = c.req.valid('header');
    const id = headers['x-comment-id'];
    const token = headers['x-comment-token'];
    const timestamp = parseInt(headers['x-comment-timestamp'], 10);

    // Reject any suspicious pseudonyms
    const cleanPseudonym = pseudonym ? sanitize(pseudonym) : undefined;
    if (pseudonym && cleanPseudonym !== pseudonym) {
      return c.text('Pseudonym is invalid', 400); // 400 Bad Request
    }

    // Reject any suspicious message content
    const cleanMsg = sanitize(msg);
    if (cleanMsg.length === 0) {
      return c.text('Message is invalid', 400); // 400 Bad Request
    }

    // Verify token
    const hmacOk = await verifyHmac(c.env.HMAC_SECRET_KEY, id, timestamp, token);
    if (!hmacOk) {
      console.warn('Invalid HMAC for update request:', id);
      return c.text('Invalid HMAC', 403); // 403 Forbidden
    }

    const key = getCommentKey(post);
    const raw = await c.env.COMMENTS.get(key);
    const comments: Comment[] = raw ? JSON.parse(raw) : [];
    const index = comments.findIndex((c) => c.id === id);
    if (index === -1) {
      console.warn('Comment not found for update:', id);
      return c.text('Comment not found', 404); // 404 Not Found
    }

    comments[index] = {
      ...comments[index],
      // Keep original pseudonym when editing (don't allow changes)
      msg: cleanMsg,
      modDate: Date.now(), // Update modification date
    };
    await c.env.COMMENTS.put(key, JSON.stringify(comments));

    console.log(`Comment updated: ${id} for post: ${post}`);
    return c.text('Comment updated', 200); // 200 OK
  },
);

// Delete a comment
app.delete(
  '/',
  sValidator('query', CommentQuerySchema),
  sValidator('header', CommentAuthHeadersSchema),
  async (c) => {
    const { post } = c.req.valid('query');
    const headers = c.req.valid('header');
    const id = headers['x-comment-id'];
    const token = headers['x-comment-token'];
    const timestamp = parseInt(headers['x-comment-timestamp'], 10);

    // Verify token
    const hmacOk = await verifyHmac(c.env.HMAC_SECRET_KEY, id, timestamp, token);
    if (!hmacOk) {
      console.warn('Invalid HMAC for delete request:', id);
      return c.text('Invalid HMAC', 403); // 403 Forbidden
    }

    const key = getCommentKey(post);
    const raw = await c.env.COMMENTS.get(key);
    const comments: Comment[] = raw ? JSON.parse(raw) : [];

    const index = comments.findIndex((c) => c.id === id);
    if (index === -1) {
      console.warn('Comment not found for deletion:', id);
      return c.text('Comment not found', 404); // 404 Not Found
    }

    // Mark it as deleted
    comments[index] = {
      ...comments[index],
      pseudonym: CONSTANTS.deletedMarker,
      msg: CONSTANTS.deletedMarker,
      modDate: Date.now(), // Update modification date
    };

    await c.env.COMMENTS.put(key, JSON.stringify(comments));
    console.log(`Comment deleted (marked): ${id} for post: ${post}`);
    return c.text('Comment deleted', 200); // 200 OK
  },
);

export default app;
