export type Comment = {
  /** Unique identifier for the comment */
  id: string;

  /** Name of the author */
  name?: string;

  /** Email address of the author */
  email?: string;

  /** Content of the comment */
  msg: string;

  /** Publish timestamp */
  pubDate: number;

  /** Last modification timestamp */
  modDate?: number;

  /** ID of the comment being replied to */
  replyTo?: string;

  /** Indicates whether the comment was made by an admin */
  isAdmin?: boolean;
};

export function isComment(obj: unknown): obj is Comment {
  if (typeof obj !== 'object' || obj === null) return false;

  const c = obj as Record<string, unknown>;

  return (
    typeof c.id === 'string' &&
    typeof c.msg === 'string' &&
    typeof c.pubDate === 'number' &&
    (c.name === undefined || typeof c.name === 'string') &&
    (c.email === undefined || typeof c.email === 'string') &&
    (c.replyTo === undefined || typeof c.replyTo === 'string') &&
    (c.isAdmin === undefined || typeof c.isAdmin === 'boolean')
  );
}
