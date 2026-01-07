import { Hono } from 'hono';

// TODO: move to env
const PRE_POW_TIME_WINDOW = 60; // seconds
const FORMAL_POW_EXPIRY = 300; // seconds
const PRE_POW_PAYLOAD = 'FIXED';
const FORMAL_SECRET = 'FORMAL_FIXED_SECRET';

const app = new Hono();

app.get('/formal-challenge', async (c) => {
  const { challenge, nonce } = c.req.query();
  if (typeof challenge === 'string' && typeof nonce === 'string') {
    const nonceNum = parseInt(nonce, 10);
    const prePowPass = await verifyPrePow(
      2,
      challenge,
      nonceNum,
      PRE_POW_PAYLOAD,
      PRE_POW_TIME_WINDOW,
    );
    if (!prePowPass) {
      console.warn('Pre-PoW verification failed');
      return c.text('Pre-PoW verification failed', 400);
    }
    console.debug('Pre-pow verify OK');
  } else {
    return c.text('Missing challenge or nonce', 400);
  }

  const difficulty = 3;
  const secret = FORMAL_SECRET;
  const expirySec = FORMAL_POW_EXPIRY;

  if (!secret) {
    console.error('FORMAL_POW_SECRET_KEY is not set');
    return c.text('Server misconfiguration', 500);
  }

  try {
    const formalChallenge = await genFormalPowChallenge(difficulty, secret, expirySec);
    return c.json({ challenge: formalChallenge }, 200);
  } catch (err) {
    console.error('Error generating formal PoW challenge:', err);
    return c.text('Internal Server Error', 500);
  }
});

export default app;

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

async function verifyPow(difficulty: number, challenge: string, nonce: number): Promise<boolean> {
  if (nonce < 0 || difficulty <= 0) return false;

  const hash = await sha256(`${challenge}:${nonce}`);
  const targetPrefix = '0'.repeat(difficulty);
  return hash.startsWith(targetPrefix);
}

export async function genFormalPowChallenge(
  difficulty: number,
  secret: string,
  expirySec: number,
): Promise<string> {
  if (difficulty <= 0) throw new Error('Difficulty must be greater than 0');

  const random = crypto.getRandomValues(new Uint32Array(2)).join('');
  const expiry = Math.floor(Date.now() / 1000) + expirySec;
  const payload = `${random}:${expiry}:${difficulty}`;
  const signature = await sha256(payload + ':' + secret);
  return `${payload}:${signature}`;
}

export async function verifyPrePow(
  difficulty: number,
  challenge: string,
  nonce: number,
  magic: string,
  timeWindowSec: number,
): Promise<boolean> {
  const parts = challenge.split(':');
  if (parts.length !== 2) return false;

  const timestamp = parseInt(parts[0], 10);
  const diffTimestamp = Math.floor(Date.now() / 1000) - timestamp;
  if (isNaN(timestamp) || diffTimestamp > timeWindowSec || diffTimestamp < 0) return false;
  if (parts[1] !== magic) return false;

  return verifyPow(difficulty, challenge, nonce);
}

export async function verifyFormalPow(
  challenge: string,
  post: string,
  nonce: number,
  secret: string,
): Promise<boolean> {
  const parts = challenge.split(':');
  if (parts.length !== 4) return false;

  const random = parts[0];
  const expiry = parseInt(parts[1], 10);
  const difficulty = parseInt(parts[2], 10);
  const signature = parts[3];

  const now = Math.floor(Date.now() / 1000);
  if (isNaN(expiry) || now > expiry) return false;

  if (isNaN(difficulty)) return false;

  const verifySign = await sha256(`${random}:${expiry}:${difficulty}:${secret}`);
  if (signature !== verifySign) return false;
  // TODO: redis

  const ok = await verifyPow(difficulty, `${challenge}:${post}`, nonce);
  if (ok) {
    // TODO: redis
  }

  return ok;
}
