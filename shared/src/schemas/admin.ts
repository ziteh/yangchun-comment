import { z } from 'zod';

export const AdminLoginRequestSchema = z.object({
  username: z.string(),
  password: z.string(),
});
export type AdminLoginRequest = z.infer<typeof AdminLoginRequestSchema>;

export const AdminLoginResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type AdminLoginResponse = z.infer<typeof AdminLoginResponseSchema>;

export const AdminLogoutResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type AdminLogoutResponse = z.infer<typeof AdminLogoutResponseSchema>;

export const AdminCheckResponseSchema = z.object({
  authenticated: z.boolean(),
});
export type AdminCheckResponse = z.infer<typeof AdminCheckResponseSchema>;
