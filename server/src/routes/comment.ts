import { Hono } from 'hono';
import { sValidator } from '@hono/standard-validator';
import { genId } from '../utils/helpers';
import { CONSTANTS, HTTP_STATUS } from '../const';
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
    HMAC_SECRET_KEY: string;
    POST_BASE_URL: string;
    FORMAL_POW_SECRET_KEY: string;
    PRE_POW_DIFFICULTY: number;
    PRE_POW_MAGIC_WORD: string;
    RE_POW_TIME_WINDOW: number;
    FORMAL_POW_DIFFICULTY: number;
    FORMAL_POW_EXPIRATION: number;
    ADMIN_SECRET_KEY: string;
  };
}>();

// Get comments for a post
app.get('/', sValidator('query', CommentQuerySchema), async (c) => {
  const { post } = c.req.query();
  const comments = await getCommentsByPost(c.env.DB, post);

  // Check admin auth status
  const cookie = c.req.header('Cookie');
  const isAdmin = await verifyAdminToken(cookie, c.env.ADMIN_SECRET_KEY, c.env.KV);

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
      c.env.FORMAL_POW_SECRET_KEY,
      c.env.KV,
    );
    if (!powPass) {
      console.warn('Formal-PoW verification failed');
      return c.text('Formal-PoW verification failed', HTTP_STATUS.BadRequest);
    }

    // Reject any suspicious pseudonyms
    const cleanPseudonym = pseudonym ? sanitize(pseudonym) : undefined;
    if (pseudonym && cleanPseudonym !== pseudonym) {
      return c.text('Pseudonym is invalid', HTTP_STATUS.BadRequest);
    }

    // Reject any suspicious message content
    const cleanMsg = sanitize(msg);
    if (cleanMsg.length === 0) {
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
    const isAdmin = await verifyAdminToken(cookieHeader, c.env.ADMIN_SECRET_KEY, c.env.KV);

    const comment: Comment = {
      id,
      pseudonym,
      msg,
      replyTo,
      pubDate: timestamp,
      ...(isAdmin && { isAdmin: true }),
    };

    const success = await createComment(c.env.DB, post, comment);
    if (!success) {
      console.error('Failed to create comment in database');
      return c.text('Failed to create comment', HTTP_STATUS.InternalServerError);
    }

    const token = await genHmac(c.env.HMAC_SECRET_KEY, id, timestamp);

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

    // Reject any suspicious pseudonyms
    const cleanPseudonym = pseudonym ? sanitize(pseudonym) : undefined;
    if (pseudonym && cleanPseudonym !== pseudonym) {
      return c.text('Pseudonym is invalid', HTTP_STATUS.BadRequest);
    }

    // Reject any suspicious message content
    const cleanMsg = sanitize(msg);
    if (cleanMsg.length === 0) {
      return c.text('Message is invalid', HTTP_STATUS.BadRequest);
    }

    // Verify token
    const hmacOk = await verifyHmac(c.env.HMAC_SECRET_KEY, id, timestamp, token);
    if (!hmacOk) {
      console.warn('Invalid HMAC for update request:', id);
      return c.text('Invalid HMAC', HTTP_STATUS.Forbidden);
    }

    const success = await updateComment(c.env.DB, id, cleanMsg, Date.now());
    if (!success) {
      console.warn('Comment not found for update or failed to update:', id);
      return c.text('Comment not found or update failed', 404); // 404 Not Found
    }

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
    const hmacOk = await verifyHmac(c.env.HMAC_SECRET_KEY, id, timestamp, token);
    if (!hmacOk) {
      console.warn('Invalid HMAC for delete request:', id);
      return c.text('Invalid HMAC', HTTP_STATUS.Forbidden);
    }

    const success = await deleteComment(c.env.DB, id, CONSTANTS.deletedMarker, Date.now());
    if (!success) {
      console.warn('Comment not found for deletion or failed to delete:', id);
      return c.text('Comment not found or delete failed', HTTP_STATUS.NotFound);
    }

    console.log(`Comment deleted (marked): ${id} for post: ${post}`);
    return c.text('Comment deleted', HTTP_STATUS.Ok);
  },
);

export default app;
