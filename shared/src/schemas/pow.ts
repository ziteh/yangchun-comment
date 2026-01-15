import { z } from 'zod';

export const FormalChallengeRequestSchema = z.object({
  challenge: z.string(),
  nonce: z.number().int().positive(),
});
export type FormalChallengeRequest = z.infer<typeof FormalChallengeRequestSchema>;

export const FormalChallengeResponseSchema = z.object({
  challenge: z.string(),
});
export type FormalChallengeResponse = z.infer<typeof FormalChallengeResponseSchema>;
