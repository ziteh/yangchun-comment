import { validator } from 'hono/validator';
import { customAlphabet } from 'nanoid';
import sanitizeHtml from 'sanitize-html';

export default class Utils {
  static sanitize(raw: string) {
    const sanitized = sanitizeHtml(raw, {
      allowedTags: [], // no tags allowed
      allowedAttributes: {}, // no attributes allowed
      disallowedTagsMode: 'discard', // or 'completelyDiscard'
      parser: {
        decodeEntities: true, // It is recommended to never disable the 'decodeEntities' option
        lowerCaseTags: true,
      },
    });
    return sanitized.replace(/\]\(\s*javascript:[^)]+\)/gi, ']('); // protection against markdown javascript links
  }

  static genId() {
    // 100 IDs per Hour: ~352 years or 308M IDs needed, in order to have a 1% probability of at least one collision.
    // https://zelark.github.io/nano-id-cc/
    return customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 12)();
  }

  static getCommentKey(post: string) {
    return `comments:${post}`;
  }

  static validateQueryPost = validator('query', (value, c) => {
    const post = value['post'];
    if (!post || typeof post !== 'string') {
      return c.text('Invalid post', 400); // 400 Bad Request
    }

    // TODO Regex validation for post

    return {
      post,
    };
  });

  static async genHmac(secretKey: string, commentId: string, timestamp: number) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const dataData = encoder.encode(`${commentId}-${timestamp}`);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-384' },
      false,
      ['sign'],
    );

    const signature = await crypto.subtle.sign('HMAC', key, dataData);
    const base64Signature = Buffer.from(signature).toString('base64');
    return base64Signature;
  }

  static async verifyHmac(secretKey: string, commentId: string, timestamp: number, hmac: string) {
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
      { name: 'HMAC', hash: 'SHA-384' },
      false,
      ['verify'],
    );

    const signature = Buffer.from(hmac, 'base64');
    return crypto.subtle.verify('HMAC', key, signature, dataData);
  }
}
