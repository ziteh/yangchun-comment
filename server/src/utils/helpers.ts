import { customAlphabet } from 'nanoid';
import { CONSTANTS } from '../const';

export function genId() {
  // 100 IDs per Hour: ~352 years or 308M IDs needed, in order to have a 1% probability of at least one collision.
  // https://zelark.github.io/nano-id-cc/
  return customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 12)();
}

export function getCommentKey(post: string) {
  return `${CONSTANTS.commentsKeyPrefix}${post}`;
}
