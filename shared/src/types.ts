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

  /** ID of the comment being replied to */
  replyTo?: string;

  /** Indicates whether the comment was made by an admin */
  isAdmin?: boolean;
};
