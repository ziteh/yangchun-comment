import { Hono } from 'hono';
import { sValidator } from '@hono/standard-validator';
import {
  FormalChallengeRequestSchema,
  FormalChallengeResponseSchema,
} from '@ziteh/yangchun-comment-shared';
import { genFormalPowChallenge, verifyPrePow } from '../utils/crypto';
import { HTTP_STATUS } from '../const';

const app = new Hono<{
  Bindings: {
    PRE_POW_DIFFICULTY: number;
    PRE_POW_TIME_WINDOW: number;
    PRE_POW_SALT: string;
    FORMAL_POW_DIFFICULTY: number;
    FORMAL_POW_EXPIRATION: number;
    SECRET_FORMAL_POW_HMAC_KEY: string;
  };
}>();

app.post('/formal-challenge', sValidator('json', FormalChallengeRequestSchema), async (c) => {
  const { challenge, nonce } = c.req.valid('json');
  const prePowPass = await verifyPrePow(
    c.env.PRE_POW_DIFFICULTY,
    challenge,
    nonce,
    c.env.PRE_POW_SALT,
    c.env.PRE_POW_TIME_WINDOW,
  );
  if (!prePowPass) {
    console.warn('Pre-PoW verification failed');
    return c.text('Pre-PoW verification failed', HTTP_STATUS.BadRequest);
  }
  console.debug('Pre-pow verify OK');

  // TODO: dynamic difficulty
  const difficulty = c.env.FORMAL_POW_DIFFICULTY;
  const secret = c.env.SECRET_FORMAL_POW_HMAC_KEY;
  const expirySec = c.env.FORMAL_POW_EXPIRATION;

  try {
    const formalChallenge = await genFormalPowChallenge(difficulty, secret, expirySec);
    const response = FormalChallengeResponseSchema.parse({ challenge: formalChallenge });
    return c.json(response, HTTP_STATUS.Ok);
  } catch (err) {
    console.error('Error generating formal PoW challenge:', err);
    return c.text('Internal Server Error', HTTP_STATUS.InternalServerError);
  }
});

export default app;
