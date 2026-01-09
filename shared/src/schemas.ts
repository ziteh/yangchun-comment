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
 * POST /api/comment request body schema
 */
export const CreateCommentRequestSchema = z.object({
  pseudonym: z.string().optional(),
  msg: z.string(),
  replyTo: z.string().optional(),
  email: z.string().optional(), // Honeypot field
});
export type CreateCommentRequest = z.infer<typeof CreateCommentRequestSchema>;

/**
 * POST /api/comment response schema
 */
export const CreateCommentResponseSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  token: z.string(),
});
export type CreateCommentResponse = z.infer<typeof CreateCommentResponseSchema>;

/**
 * PUT /api/comment request body schema
 */
export const UpdateCommentRequestSchema = z.object({
  pseudonym: z.string().optional(),
  msg: z.string(),
});
export type UpdateCommentRequest = z.infer<typeof UpdateCommentRequestSchema>;

/**
 * POST /admin/login response schema
 */
export const AdminLoginResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type AdminLoginResponse = z.infer<typeof AdminLoginResponseSchema>;

/**
 * Query parameters schema for comment endpoints
 */
export const CommentQuerySchema = z.object({
  post: z.string(),
});
export type CommentQuery = z.infer<typeof CommentQuerySchema>;

/**
 * POST /admin/login request body schema
 */
export const AdminLoginRequestSchema = z.object({
  username: z.string(),
  password: z.string(),
});
export type AdminLoginRequest = z.infer<typeof AdminLoginRequestSchema>;

/**
 * POST /admin/logout response schema
 */
export const AdminLogoutResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type AdminLogoutResponse = z.infer<typeof AdminLogoutResponseSchema>;

/**
 * GET /admin/check response schema
 */
export const AdminCheckResponseSchema = z.object({
  authenticated: z.boolean(),
});
export type AdminCheckResponse = z.infer<typeof AdminCheckResponseSchema>;

/**
 * GET /api/pow/formal-challenge query parameters schema
 */
export const FormalChallengeQuerySchema = z.object({
  challenge: z.string(),
  nonce: z.string(),
});
export type FormalChallengeQuery = z.infer<typeof FormalChallengeQuerySchema>;

/**
 * GET /api/pow/formal-challenge response schema
 */
export const FormalChallengeResponseSchema = z.object({
  challenge: z.string(),
});
export type FormalChallengeResponse = z.infer<typeof FormalChallengeResponseSchema>;
