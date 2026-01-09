import { sValidator } from '@hono/standard-validator';
import { customAlphabet } from 'nanoid';
import { CONSTANTS } from './const';
import sanitizeHtml from 'sanitize-html';
import { verify } from 'hono/jwt';
import { CommentQuerySchema } from '@ziteh/yangchun-comment-shared';

export function sanitize(raw: unknown): string {
  if (typeof raw !== 'string') return '';

  const htmlRemoved = sanitizeHtml(raw, {
    allowedTags: [], // no tags allowed
    allowedAttributes: {}, // no attributes allowed
    disallowedTagsMode: 'discard', // or 'completelyDiscard'
    parser: {
      // If set to true, entities within the document will be decoded. Defaults to true.
      // It is recommended to never disable the 'decodeEntities' option
      decodeEntities: true,
      lowerCaseTags: true,
    },
  });

  // src: https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/shared/sanitizeURL.js#L22
  // const isJavaScriptProtocol =
  //  /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*\:/i;

  // return htmlRemoved.replace(/\]\(\s*javascript:[^)]+\)/gi, '](');
  return htmlRemoved;
}

export function genId() {
  // 100 IDs per Hour: ~352 years or 308M IDs needed, in order to have a 1% probability of at least one collision.
  // https://zelark.github.io/nano-id-cc/
  return customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 12)();
}

export function getCommentKey(post: string) {
  return `${CONSTANTS.commentsKeyPrefix}${post}`;
}

export const validateQueryPost = sValidator('query', CommentQuerySchema);

export async function genHmac(secretKey: string, commentId: string, timestamp: number) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const dataData = encoder.encode(`${commentId}-${timestamp}`);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', key, dataData);
  const base64Signature = Buffer.from(signature).toString('base64');
  return base64Signature;
}

export async function verifyHmac(
  secretKey: string,
  commentId: string,
  timestamp: number,
  hmac: string,
) {
  const expiry = 2 * 60 * 1000; // 2 minutes in milliseconds
  const now = Date.now();
  if (now - timestamp > expiry || timestamp > now) {
    return false; // timestamp is too old or in the future, reject it
  }

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const dataData = encoder.encode(`${commentId}-${timestamp}`);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const signature = Buffer.from(hmac, 'base64');
  return crypto.subtle.verify('HMAC', key, signature, dataData);
}

export function hashFnv1a(input: string): string {
  const FNV_OFFSET_BASIS = 0x811c9dc5;
  const FNV_PRIME = 0x01000193;

  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }

  // Convert to unsigned 32-bit and then to base36
  return (hash >>> 0).toString(36);
}

/**
 * Verify the post exists.
 * @param url the URL of the post to validate.
 * @param timeout in milliseconds.
 * @returns true if the post exists, false otherwise.
 */
export async function validatePostUrl(url: string, timeout: number): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'HEAD', // Use HEAD to avoid downloading the full page
      signal: AbortSignal.timeout(timeout),
    });

    return res.ok;
  } catch (err) {
    console.warn(`Blog post validation failed for ${url}:`, err);
    return false;
  }
}

export async function verifyAdminToken(
  cookieHeader: string | undefined,
  secretKey: string,
): Promise<boolean> {
  try {
    if (!cookieHeader) return false;

    const match = cookieHeader.match(/admin_token=([^;]+)/);
    if (!match) return false;

    const token = match[1];
    await verify(token, secretKey);
    return true;
  } catch {
    return false;
  }
}
