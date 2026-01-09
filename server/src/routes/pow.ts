import { Hono } from 'hono';
import { sValidator } from '@hono/standard-validator';
import {
  FormalChallengeQuerySchema,
  FormalChallengeResponseSchema,
} from '@ziteh/yangchun-comment-shared';
import { genFormalPowChallenge, verifyPrePow } from '../utils/crypto';

const app = new Hono<{
  Bindings: {
    PRE_POW_DIFFICULTY: number;
    PRE_POW_TIME_WINDOW: number;
    PRE_POW_MAGIC_WORD: string;
    FORMAL_POW_DIFFICULTY: number;
    FORMAL_POW_EXPIRATION: number;
    FORMAL_POW_SECRET_KEY: string;
  };
}>();

app.get('/formal-challenge', sValidator('query', FormalChallengeQuerySchema), async (c) => {
  const { challenge, nonce } = c.req.valid('query');
  const nonceNum = parseInt(nonce, 10);
  const prePowPass = await verifyPrePow(
    c.env.PRE_POW_DIFFICULTY,
    challenge,
    nonceNum,
    c.env.PRE_POW_MAGIC_WORD,
    c.env.PRE_POW_TIME_WINDOW,
  );
  if (!prePowPass) {
    console.warn('Pre-PoW verification failed');
    return c.text('Pre-PoW verification failed', 400);
  }
  console.debug('Pre-pow verify OK');

  const difficulty = c.env.FORMAL_POW_DIFFICULTY;
  const secret = c.env.FORMAL_POW_SECRET_KEY;
  const expirySec = c.env.FORMAL_POW_EXPIRATION;

  if (!secret) {
    console.error('FORMAL_POW_SECRET_KEY is not set');
    return c.text('Server misconfiguration', 500);
  }

  try {
    const formalChallenge = await genFormalPowChallenge(difficulty, secret, expirySec);
    const response = FormalChallengeResponseSchema.parse({ challenge: formalChallenge });
    return c.json(response, 200);
  } catch (err) {
    console.error('Error generating formal PoW challenge:', err);
    return c.text('Internal Server Error', 500);
  }
});

export default app;
