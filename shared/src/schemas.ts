import { z } from 'zod';

/** Comment schema */
export const CommentSchema = z.object({
  /** Unique identifier for the comment */
  id: z.string(),

  /** Pseudonym of the author */
  pseudonym: z.string().optional(),

  /** Content of the comment */
  msg: z.string(),

  /** Publish timestamp */
  pubDate: z.number(),

  /** Last modification timestamp */
  modDate: z.number().optional(),

  /** ID of the comment being replied to */
  replyTo: z.string().optional(),

  /** Indicates whether the comment was made by an admin */
  isAdmin: z.boolean().optional(),
});

/**
 * Inferred Comment type from schema
 */
export type Comment = z.infer<typeof CommentSchema>;

/**
 * GET /api/comment response schema
 */
export const GetCommentsResponseSchema = z.object({
  comments: z.array(CommentSchema),
  isAdmin: z.boolean(),
});
export type GetCommentsResponse = z.infer<typeof GetCommentsResponseSchema>;

/**
 * POST /api/comment response schema
 */
export const CreateCommentResponseSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  token: z.string(),
});
export type CreateCommentResponse = z.infer<typeof CreateCommentResponseSchema>;
