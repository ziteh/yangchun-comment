import { CommentSchema } from './schemas';
export type { Comment } from './schemas';

export function isComment(obj: unknown): boolean {
  return CommentSchema.safeParse(obj).success;
}
