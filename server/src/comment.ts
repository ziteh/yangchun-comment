import { Hono } from 'hono';
import { sValidator } from '@hono/standard-validator';
import {
  sanitize,
  genId,
  getCommentKey,
  validateQueryPost,
  genHmac,
  verifyHmac,
  validatePostUrl,
  verifyAdminToken,
} from './utils';
import { DEF, CONSTANTS } from './const';
import {
  type Comment,
  CreateCommentRequestSchema,
  UpdateCommentRequestSchema,
  GetCommentsResponseSchema,
  CreateCommentResponseSchema,
} from '@ziteh/yangchun-comment-shared';
import { verifyFormalPow } from './pow';

const app = new Hono<{
  Bindings: {
    COMMENTS: KVNamespace;
    HMAC_SECRET_KEY: string;
    MAX_PSEUDONYM_LENGTH: number;
    MAX_MSG_LENGTH: number;
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
app.get('/', validateQueryPost, async (c) => {
  const { post } = c.req.query();

  const key = getCommentKey(post);
  const raw = await c.env.COMMENTS.get(key);
  const comments = raw ? JSON.parse(raw) : [];

  // Check admin auth status
  const cookie = c.req.header('Cookie');
  const isAdmin = await verifyAdminToken(cookie, c.env.ADMIN_SECRET_KEY);

  console.debug(`Fetched ${comments.length} comments for post: ${post}, admin: ${isAdmin}`);

  const res = GetCommentsResponseSchema.parse({ comments, isAdmin });
  return c.json(res, 200); // 200 OK
});

// Create a new comment
app.post('/', validateQueryPost, sValidator('json', CreateCommentRequestSchema), async (c) => {
  const { pseudonym, msg, replyTo, email } = c.req.valid('json');
  const { challenge, nonce, post } = c.req.query();
  if (typeof challenge !== 'string' || typeof nonce !== 'string') {
    return c.text('Missing challenge or nonce', 400);
  }

  const nonceNum = parseInt(nonce, 10);
  const powPass = await verifyFormalPow(challenge, post, nonceNum, c.env.FORMAL_POW_SECRET_KEY);
  if (!powPass) {
    console.warn('Formal-PoW verification failed');
    return c.text('Formal-PoW verification failed', 400);
  }
  console.debug('Formal-PoW verify OK');

  // Honeypot check: if 'email' field is filled, it's likely a bot
  if (email) {
    const ip = c.req.header('CF-Connecting-IP') || 'unknown';
    console.warn(`Honeypot triggered from IP: ${ip}`);

    // Return 200 OK to fool bots, but don't actually process the comment
    return c.text('Comment received', 200);
  }

  if (!msg || typeof msg !== 'string') {
    return c.text('Missing or invalid msg field', 400);
  }

  const maxMsgLength = c.env.MAX_MSG_LENGTH || DEF.maxMsgLength;
  if (msg.length > maxMsgLength) {
    return c.text(`Message is too long (maximum ${maxMsgLength} characters)`, 400);
  }

  const cleanMsg = sanitize(msg);
  if (cleanMsg.length === 0) {
    return c.text('Message is invalid', 400);
  }

  const maxPseudonymLength = c.env.MAX_PSEUDONYM_LENGTH || DEF.maxPseudonymLength;
  if (pseudonym && typeof pseudonym === 'string' && pseudonym.length > maxPseudonymLength) {
    return c.text(`Pseudonym is too long (maximum ${maxPseudonymLength} characters)`, 400);
  }
  const cleanPseudonym = pseudonym ? sanitize(pseudonym) : undefined;
  if (pseudonym && cleanPseudonym !== undefined && cleanPseudonym.length === 0) {
    return c.text('Pseudonym is invalid', 400);
  }

  if (replyTo && (typeof replyTo !== 'string' || !/^[0-9A-Z]{12}$/.test(replyTo))) {
    return c.text('Invalid reply ID', 400);
  }

  const key = getCommentKey(post);
  const rawComments = await c.env.COMMENTS.get(key);
  if (!rawComments) {
    // No comments yet for this post
    const baseUrl = c.env.POST_BASE_URL || DEF.postBaseUrl;
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
  const isAdmin = await verifyAdminToken(cookieHeader, c.env.ADMIN_SECRET_KEY);

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

  // Debug: Check if HMAC_SECRET_KEY exists
  if (!c.env.HMAC_SECRET_KEY) {
    console.error('HMAC_SECRET_KEY is not set in environment variables!');
    return c.text('Server configuration error', 500);
  }
  console.debug('HMAC_SECRET_KEY length:', c.env.HMAC_SECRET_KEY.length);

  const token = await genHmac(c.env.HMAC_SECRET_KEY, id, timestamp);

  console.log(`Comment created with ID: ${id} for post: ${post}`);

  const res = CreateCommentResponseSchema.parse({ id, timestamp, token });
  return c.json(res, 201); // 201 Created
});

// Update a comment
app.put('/', validateQueryPost, sValidator('json', UpdateCommentRequestSchema), async (c) => {
  const { post } = c.req.valid('query');
  const { pseudonym, msg } = c.req.valid('json');
  const id = c.req.header('X-Comment-ID') || '';
  const token = c.req.header('X-Comment-Token') || '';
  const timestamp = parseInt(c.req.header('X-Comment-Timestamp') || '0');

  if (!msg || typeof msg !== 'string') {
    console.warn('Invalid message for update:', msg);
    return c.text('Missing fields', 400); // 400 Bad Request
  }

  const maxMsgLength = c.env.MAX_MSG_LENGTH || DEF.maxMsgLength;
  if (msg.length > maxMsgLength) {
    console.warn('Message too long for update:', msg.length);
    return c.text(`Message is too long (maximum ${maxMsgLength} characters)`, 400);
  }

  const cleanMsg = sanitize(msg);
  if (cleanMsg.length === 0) {
    return c.text('Message is invalid', 400);
  }

  const maxPseudonymLength = c.env.MAX_PSEUDONYM_LENGTH || DEF.maxPseudonymLength;
  if (pseudonym && typeof pseudonym === 'string' && pseudonym.length > maxPseudonymLength) {
    console.warn('Pseudonym too long for update:', pseudonym.length);
    return c.text(`Pseudonym is too long (maximum ${maxPseudonymLength} characters)`, 400);
  }
  const cleanPseudonym = pseudonym ? sanitize(pseudonym) : undefined;
  if (pseudonym && cleanPseudonym !== undefined && cleanPseudonym.length === 0) {
    return c.text('Pseudonym is invalid', 400);
  }

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
    // pseudonym: cleanPseudonym,
    msg: cleanMsg,
    modDate: Date.now(), // Update modification date
  };
  await c.env.COMMENTS.put(key, JSON.stringify(comments));

  console.log(`Comment updated: ${id} for post: ${post}`);
  return c.text('Comment updated', 200); // 200 OK
});

// Delete a comment
app.delete('/', validateQueryPost, async (c) => {
  const { post } = c.req.valid('query');

  const id = c.req.header('X-Comment-ID') || '';
  const token = c.req.header('X-Comment-Token') || '';
  const timestamp = parseInt(c.req.header('X-Comment-Timestamp') || '0');

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
});

export default app;
