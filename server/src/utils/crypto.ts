import { verify } from 'hono/jwt';

export async function hmacSha256(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const secretData = encoder.encode(secret);
  const dataData = encoder.encode(data);
  const key = await crypto.subtle.importKey(
    'raw',
    secretData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, dataData);
  return Buffer.from(mac).toString('base64');
}

export async function genHmac(secretKey: string, commentId: string, timestamp: number) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const dataData = encoder.encode(`${commentId}-${timestamp}`);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', key, dataData);
  const base64Signature = Buffer.from(signature).toString('base64');
  return base64Signature;
}

export async function verifyHmac(
  secretKey: string,
  commentId: string,
  timestamp: number,
  hmac: string,
) {
  const expiry = 2 * 60 * 1000; // 2 minutes in milliseconds
  const now = Date.now();
  if (now - timestamp > expiry || timestamp > now) {
    return false; // timestamp is too old or in the future, reject it
  }

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const dataData = encoder.encode(`${commentId}-${timestamp}`);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const signature = Buffer.from(hmac, 'base64');
  return crypto.subtle.verify('HMAC', key, signature, dataData);
}

export function hashFnv1a(input: string): string {
  const FNV_OFFSET_BASIS = 0x811c9dc5;
  const FNV_PRIME = 0x01000193;

  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }

  // Convert to unsigned 32-bit and then to base36
  return (hash >>> 0).toString(36);
}

export async function verifyAdminToken(
  cookieHeader: string | undefined,
  secretKey: string,
  jtiBlacklist: KVNamespace,
): Promise<boolean> {
  try {
    if (!cookieHeader) return false;

    const match = cookieHeader.match(/admin_token=([^;]+)/);
    if (!match) return false;

    const token = match[1];
    const payload = await verify(token, secretKey);

    // Check JTI blacklist
    if (jtiBlacklist && payload.jti) {
      const jtiKey = `jti_blacklist:${payload.jti}`;
      const isBlacklisted = await jtiBlacklist.get(jtiKey);
      if (isBlacklisted) return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function hashSha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

async function verifyPow(difficulty: number, challenge: string, nonce: number): Promise<boolean> {
  if (nonce < 0 || difficulty <= 0) return false;

  const hash = await hashSha256(`${challenge}:${nonce}`);
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
  const signature = await hashSha256(payload + ':' + secret);
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

  const verifySign = await hashSha256(`${random}:${expiry}:${difficulty}:${secret}`);
  if (signature !== verifySign) return false;
  // TODO: redis

  const ok = await verifyPow(difficulty, `${challenge}:${post}`, nonce);
  if (ok) {
    // TODO: redis
  }

  return ok;
}

export async function constantTimeCompare(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);

  const maxLen = Math.max(aBytes.length, bBytes.length);
  const bufferA = new Uint8Array(maxLen);
  const bufferB = new Uint8Array(maxLen);

  bufferA.set(aBytes);
  bufferB.set(bBytes);
  const isLenEqual = aBytes.length === bBytes.length;

  try {
    // https://developers.cloudflare.com/workers/runtime-apis/web-crypto/#timingsafeequal
    const isBufEqual = crypto.subtle.timingSafeEqual(bufferA, bufferB);
    return isLenEqual && isBufEqual;
  } catch {
    return false;
  }
}
