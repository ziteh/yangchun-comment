import { z } from 'zod';

const MAX_MSG_LENGTH = 1000;
const MAX_PSEUDONYM_LENGTH = 80;
const COMMENT_ID_REGEX = /^[0-9A-Z]{12}$/;
const PSEUDONYM_REGEX = /^[a-zA-Z\s]*$/;

export const CommentSchema = z.object({
  /** Unique comment identifier */
  id: z.string(),

  /** Author's display name; anonymous if omitted */
  pseudonym: z.string().optional(),

  /** The comment body text */
  msg: z.string(),

  /** Publish timestamp */
  pubDate: z.number(),

  /** Last modified timestamp, if edited or deleted */
  modDate: z.number().optional(),

  /** Parent comment ID, if this comment is a reply */
  replyTo: z.string().optional(),

  /** Flags if the author is an admin */
  isAdmin: z.boolean().optional(),
});
export type Comment = z.infer<typeof CommentSchema>;

export const GetCommentsResponseSchema = z.object({
  comments: z.array(CommentSchema),
  isAdmin: z.boolean(),
});
export type GetCommentsResponse = z.infer<typeof GetCommentsResponseSchema>;

export const CreateCommentRequestSchema = z.object({
  pseudonym: z.string().max(MAX_PSEUDONYM_LENGTH).regex(PSEUDONYM_REGEX).optional(),
  msg: z.string().min(1).max(MAX_MSG_LENGTH),
  replyTo: z.string().regex(COMMENT_ID_REGEX).optional(),
  email: z.string().optional(), // Honeypot field
});
export type CreateCommentRequest = z.infer<typeof CreateCommentRequestSchema>;

export const CreateCommentResponseSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  token: z.string(),
});
export type CreateCommentResponse = z.infer<typeof CreateCommentResponseSchema>;

export const UpdateCommentRequestSchema = z.object({
  pseudonym: z.string().max(MAX_PSEUDONYM_LENGTH).regex(PSEUDONYM_REGEX).optional(),
  msg: z.string().min(1).max(MAX_MSG_LENGTH),
});
export type UpdateCommentRequest = z.infer<typeof UpdateCommentRequestSchema>;

export const CommentQuerySchema = z.object({
  post: z.string(),
});
export type CommentQuery = z.infer<typeof CommentQuerySchema>;

export const CreateCommentQuerySchema = z.object({
  post: z.string(),
  challenge: z.string(),
  nonce: z.string().regex(/^\d+$/), // Must be numeric string
});
export type CreateCommentQuery = z.infer<typeof CreateCommentQuerySchema>;

export const CommentAuthHeadersSchema = z.object({
  'x-comment-id': z.string(),
  'x-comment-token': z.string(),
  'x-comment-timestamp': z.string(),
});
export type CommentAuthHeaders = z.infer<typeof CommentAuthHeadersSchema>;
