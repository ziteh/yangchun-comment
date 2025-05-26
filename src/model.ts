export type Comment = {
  /** Unique ID for the comment */
  id: string;

  /** Author name */
  name?: string;

  /** Author email */
  email?: string;

  /** Content */
  msg: string;

  /** Publish timestamp */
  pubDate: number;

  /** ID of the comment this is a reply to */
  replyTo?: string;

  /** Is this comment by an admin? */
  isAdmin?: boolean;
};
