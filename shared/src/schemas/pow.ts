import { z } from 'zod';

export const FormalChallengeQuerySchema = z.object({
  challenge: z.string(),
  nonce: z.string(),
});
export type FormalChallengeQuery = z.infer<typeof FormalChallengeQuerySchema>;

export const FormalChallengeResponseSchema = z.object({
  challenge: z.string(),
});
export type FormalChallengeResponse = z.infer<typeof FormalChallengeResponseSchema>;
