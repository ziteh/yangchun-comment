import { validator } from 'hono/validator';
import { customAlphabet } from 'nanoid';
import sanitizeHtml from 'sanitize-html';

export default class Utils {
  static sanitize(raw: unknown): string {
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
    const isJavaScriptProtocol =
      /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*\:/i;

    return htmlRemoved.replace(/\]\(\s*javascript:[^)]+\)/gi, '](');
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
      console.warn('Invalid post query parameter:', post);
      return c.text('Invalid post', 400); // 400 Bad Request
    }

    // Regex validation
    const postRegex = new RegExp(c.env.POST_REGEX || '^.{1,200}$');
    if (!postRegex.test(post)) {
      console.warn('Post query parameter does not match regex:', post);
      return c.text('Invalid post', 400); // 400 Bad Request
    }

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

  static hashFnv1a(ip: string): string {
    const FNV_OFFSET_BASIS = 0x811c9dc5;
    const FNV_PRIME = 0x01000193;

    let hash = FNV_OFFSET_BASIS;
    for (let i = 0; i < ip.length; i++) {
      hash ^= ip.charCodeAt(i);
      hash = Math.imul(hash, FNV_PRIME);
    }

    // Convert to unsigned 32-bit and then to base36
    return (hash >>> 0).toString(36);
  }
}
