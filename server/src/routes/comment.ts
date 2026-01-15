import { Hono } from 'hono';
import { sValidator } from '@hono/standard-validator';
import { genId } from '../utils/helpers';
import { CONSTANTS, HTTP_STATUS } from '../const';
import {
  type Comment,
  CommentSchema,
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
import { sendDiscordNotification } from '../utils/notify';
import {
  getCommentsByPost,
  createComment,
  updateComment,
  deleteComment,
  hasComments,
} from '../utils/db';

const app = new Hono<{
  Bindings: {
    DB: D1Database;
    KV: KVNamespace;
    SECRET_COMMENT_HMAC_KEY: string;
    POST_BASE_URL?: string;
    SECRET_FORMAL_POW_HMAC_KEY: string;
    SECRET_ADMIN_JWT_KEY: string;
    RSS_SITE_PATH: string;
    SECRET_DISCORD_WEBHOOK_URL?: string;
  };
}>();

// Get comments for a post
app.get('/', sValidator('query', CommentQuerySchema), async (c) => {
  const { post } = c.req.query();
  let comments: Comment[] = [];

  // Cache-Aside
  // also https://developers.cloudflare.com/workers/examples/cache-api/
  const cacheKey = `cache-comments:${post}`;
  const cached = await c.env.KV.get(cacheKey);
  if (cached) {
    console.debug(`Comments cache hit for post: ${post}`);
    const parsed = JSON.parse(cached);
    comments = parsed.map((c: unknown) => CommentSchema.parse(c));
  } else {
    console.debug(`Comments cache miss for post: ${post}`);
    comments = await getCommentsByPost(c.env.DB, post);
    c.env.KV.put(cacheKey, JSON.stringify(comments), { expirationTtl: 86400 }).catch((err) => {
      console.error('Failed to cache comments:', err);
    });
  }

  // Check admin auth status
  const cookie = c.req.header('Cookie');
  const isAdmin = await verifyAdminToken(cookie, c.env.SECRET_ADMIN_JWT_KEY, c.env.KV);

  console.debug(`Fetched ${comments.length} comments for post: ${post}, admin: ${isAdmin}`);
  const res = GetCommentsResponseSchema.parse({ comments, isAdmin });
  return c.json(res, HTTP_STATUS.Ok);
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
      return c.text('Comment received', HTTP_STATUS.Ok); // Fool the bot but do nothing
    }

    // Verify Formal-PoW
    const nonceNum = parseInt(nonce, 10);
    const powPass = await verifyFormalPow(
      challenge,
      post,
      nonceNum,
      c.env.SECRET_FORMAL_POW_HMAC_KEY,
      c.env.KV,
    );
    if (!powPass) {
      console.warn('Formal-PoW verification failed');
      return c.text('Formal-PoW verification failed', HTTP_STATUS.BadRequest);
    }

    // Reject any suspicious message content
    if (sanitize(msg).length === 0) {
      return c.text('Message is invalid', HTTP_STATUS.BadRequest);
    }

    const postHasComments = await hasComments(c.env.DB, post);
    if (!postHasComments) {
      // No comments yet for this post
      const baseUrl = c.env.POST_BASE_URL;
      if (baseUrl) {
        // Validate the post URL if POST_BASE_URL is set
        const fullUrl = `${baseUrl}${post}`;
        const isValidPost = await validatePostUrl(fullUrl, 5000);
        if (!isValidPost) {
          console.warn(`No comments found for post: ${post}, invalid post`);
          return c.text('Invalid post', HTTP_STATUS.BadRequest);
        }
      }
    }
    const id = genId();
    const timestamp = Date.now();

    // Check if the request is from an admin
    const cookieHeader = c.req.header('Cookie');
    const isAdmin = await verifyAdminToken(cookieHeader, c.env.SECRET_ADMIN_JWT_KEY, c.env.KV);

    const comment: Comment = {
      id,
      pseudonym,
      msg, // Note! this is unsafe content, sanitization should be performed on display
      replyTo,
      pubDate: timestamp,
      ...(isAdmin && { isAdmin: true }),
    };

    const success = await createComment(c.env.DB, post, comment);
    if (!success) {
      console.error('Failed to create comment in database');
      return c.text('Failed to create comment', HTTP_STATUS.InternalServerError);
    }
    // Cache invalidation
    const cacheKey = `cache-comments:${post}`;
    await c.env.KV.delete(cacheKey);
    await c.env.KV.delete(`cache-rss-thread:${post}`);
    await c.env.KV.delete(`cache-rss-site:site`);

    const token = await genHmac(c.env.SECRET_COMMENT_HMAC_KEY, id, timestamp);

    await sendDiscordNotification(
      c.env.SECRET_DISCORD_WEBHOOK_URL,
      'New Comment Created',
      `Pseudonym: ${pseudonym || 'Anonymous'}\nPost: ${post}\nMessage: ${sanitize(msg.substring(0, 200))}${msg.length > 200 ? '...' : ''}`,
    );

    console.log(`Comment created with ID: ${id} for post: ${post}`);
    const res = CreateCommentResponseSchema.parse({ id, timestamp, token });
    return c.json(res, HTTP_STATUS.Created);
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

    // Reject any suspicious message content
    if (sanitize(msg).length === 0) {
      return c.text('Message is invalid', HTTP_STATUS.BadRequest);
    }

    // Verify token
    const hmacOk = await verifyHmac(c.env.SECRET_COMMENT_HMAC_KEY, id, timestamp, token);
    if (!hmacOk) {
      console.warn('Invalid HMAC for update request:', id);
      return c.text('Invalid HMAC', HTTP_STATUS.Forbidden);
    }

    const success = await updateComment(
      c.env.DB,
      id,
      msg, // Note! this is unsafe content, sanitization should be performed on display
      Date.now(),
    );
    if (!success) {
      console.warn('Comment not found for update or failed to update:', id);
      return c.text('Comment not found or update failed', 404); // 404 Not Found
    }
    // Cache invalidation
    const cacheKey = `cache-comments:${post}`;
    await c.env.KV.delete(cacheKey);
    await c.env.KV.delete(`cache-rss-thread:${post}`);
    await c.env.KV.delete(`cache-rss-site:site`);

    await sendDiscordNotification(
      c.env.SECRET_DISCORD_WEBHOOK_URL,
      'Comment Updated',
      `Pseudonym: ${pseudonym || 'Anonymous'}\nPost: ${post}\nMessage: ${sanitize(msg.substring(0, 200))}${msg.length > 200 ? '...' : ''}`,
    );

    console.log(`Comment updated: ${id} for post: ${post}`);
    return c.text('Comment updated', HTTP_STATUS.Ok);
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
    const hmacOk = await verifyHmac(c.env.SECRET_COMMENT_HMAC_KEY, id, timestamp, token);
    if (!hmacOk) {
      console.warn('Invalid HMAC for delete request:', id);
      return c.text('Invalid HMAC', HTTP_STATUS.Forbidden);
    }

    const success = await deleteComment(c.env.DB, id, CONSTANTS.deletedMarker, Date.now());
    if (!success) {
      console.warn('Comment not found for deletion or failed to delete:', id);
      return c.text('Comment not found or delete failed', HTTP_STATUS.NotFound);
    }
    // Cache invalidation
    const cacheKey = `cache-comments:${post}`;
    await c.env.KV.delete(cacheKey);
    await c.env.KV.delete(`cache-rss-thread:${post}`);
    await c.env.KV.delete(`cache-rss-site:site`);

    console.log(`Comment deleted (marked): ${id} for post: ${post}`);
    return c.text('Comment deleted', HTTP_STATUS.Ok);
  },
);

export default app;
