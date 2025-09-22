import { Hono } from 'hono';
import { validator } from 'hono/validator';
import {
  sanitize,
  genId,
  getCommentKey,
  validateQueryPost,
  genHmac,
  verifyHmac,
  validatePostUrl,
} from './utils';
import { DEF, CONSTANTS } from './const';
import type { Comment } from '@ziteh/yangchun-comment-shared';

const app = new Hono<{
  Bindings: {
    COMMENTS: KVNamespace;
    HMAC_SECRET_KEY: string;
    MAX_PSEUDONYM_LENGTH: number;
    MAX_MSG_LENGTH: number;
    POST_REGEX?: string;
    POST_BASE_URL: string;
  };
}>();

// Get comments for a post
app.get('/', validateQueryPost, async (c) => {
  const { post } = c.req.valid('query');
  const key = getCommentKey(post);
  const raw = await c.env.COMMENTS.get(key);
  const comments = raw ? JSON.parse(raw) : [];

  console.debug(`Fetched ${comments.length} comments for post: ${post}`);
  return c.json(comments, 200); // 200 OK
});

// Create a new comment
app.post(
  '/',
  validateQueryPost,
  validator('json', (value, c) => {
    const { pseudonym, nameHash, email, msg, replyTo, website } = value;

    // Honeypot check: if 'website' field is filled, it's likely a bot
    if (website) {
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

    // Validate nameHash format (should be SHA-256 hash)
    if (nameHash && (typeof nameHash !== 'string' || !/^[a-f0-9]{64}$/.test(nameHash))) {
      return c.text('Invalid name hash format', 400);
    }

    // Validate pseudonym and nameHash combination
    // Only 3 valid combinations:
    // 1. Both are undefined
    // 2. Both are empty strings
    // 3. Both are non-empty strings
    const trimmedPseudonym = cleanPseudonym?.trim();
    const trimmedNameHash = nameHash?.trim();
    const isPseudonymEmpty = !trimmedPseudonym || trimmedPseudonym === '';
    const isNameHashEmpty = !trimmedNameHash || trimmedNameHash === '';
    if (isPseudonymEmpty !== isNameHashEmpty) {
      return c.text('Pseudonym and nameHash must both be empty or both be non-empty', 400);
    }

    if (replyTo && (typeof replyTo !== 'string' || !/^[0-9A-Z]{12}$/.test(replyTo))) {
      return c.text('Invalid reply ID', 400);
    }

    const cleanEmail = email ? sanitize(email) : undefined;

    return { pseudonym: cleanPseudonym, nameHash, email: cleanEmail, msg: cleanMsg, replyTo };
  }),
  async (c) => {
    const { post } = c.req.valid('query');
    const { pseudonym, nameHash, msg, replyTo } = c.req.valid('json');

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
    const comment: Comment = {
      id,
      pseudonym,
      nameHash,
      email: undefined, // Currently not storing email
      msg,
      replyTo,
      pubDate: timestamp,
    };

    // Save to KV
    const comments = rawComments ? JSON.parse(rawComments) : [];
    comments.push(comment);
    await c.env.COMMENTS.put(key, JSON.stringify(comments));

    const token = await genHmac(c.env.HMAC_SECRET_KEY, id, timestamp);

    console.log(`Comment created with ID: ${id} for post: ${post}`);
    return c.json({ id, timestamp, token }, 201); // 201 Created
  },
);

// Update a comment
app.put('/', validateQueryPost, async (c) => {
  const { post } = c.req.valid('query');
  const { id, timestamp, token, pseudonym, nameHash, msg } = await c.req.json();

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
  // Validate nameHash format (should be SHA-256 hash)
  if (nameHash && (typeof nameHash !== 'string' || !/^[a-f0-9]{64}$/.test(nameHash))) {
    return c.text('Invalid name hash format', 400);
  }

  // Validate pseudonym and nameHash combination
  // Only 3 valid combinations:
  // 1. Both are undefined
  // 2. Both are empty strings (after trimming)
  // 3. Both are non-empty strings (after trimming)
  const trimmedPseudonym = cleanPseudonym?.trim();
  const trimmedNameHash = nameHash?.trim();
  const isPseudonymEmpty = !trimmedPseudonym || trimmedPseudonym === '';
  const isNameHashEmpty = !trimmedNameHash || trimmedNameHash === '';
  if (isPseudonymEmpty !== isNameHashEmpty) {
    return c.text('Pseudonym and nameHash must both be empty or both be non-empty', 400);
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
    // Keep original pseudonym and nameHash when editing (don't allow changes)
    // pseudonym: cleanPseudonym,
    // nameHash,
    email: undefined, // Currently not storing email
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
    nameHash: undefined,
    email: undefined, // Currently not storing email
    modDate: Date.now(), // Update modification date
  };

  await c.env.COMMENTS.put(key, JSON.stringify(comments));
  console.log(`Comment deleted (marked): ${id} for post: ${post}`);
  return c.text('Comment deleted', 200); // 200 OK
});

export default app;
