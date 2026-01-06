const SOLVE_POW_MAX_RETRIES = 100000;

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

async function solvePow(difficulty: number, challenge: string): Promise<number> {
  let nonce = 0;
  const targetPrefix = '0'.repeat(difficulty);

  let retries = 0;
  while (retries++ < SOLVE_POW_MAX_RETRIES) {
    const hash = await sha256(`${challenge}:${nonce}`);
    if (hash.startsWith(targetPrefix)) {
      return nonce;
    }
    nonce++;
  }
  console.warn('Failed to solve PoW within max retries');
  return -1; // Indicate failure to solve PoW
}

export async function solvePrePow(
  difficulty: number,
  payload: string,
): Promise<{ challenge: string; nonce: number }> {
  const challenge = `${Math.floor(Date.now() / 1000)}:${payload}`;
  const nonce = await solvePow(difficulty, challenge);
  return {
    challenge,
    nonce,
  };
}

export async function solveFormalPow(
  difficulty: number,
  challenge: string,
  post: string,
): Promise<number> {
  const fullChallenge = `${challenge}:${post}`;
  return solvePow(difficulty, fullChallenge);
}

async function verifyPow(difficulty: number, challenge: string, nonce: number): Promise<boolean> {
  if (nonce < 0 || difficulty <= 0) return false;
  const hash = await sha256(`${challenge}:${nonce}`);
  const targetPrefix = '0'.repeat(difficulty);
  return hash.startsWith(targetPrefix);
}

export async function genFormalPowChallenge(difficulty: number): Promise<string> {
  const random = crypto.getRandomValues(new Uint32Array(2)).join('');
  const expiry = Math.floor(Date.now() / 1000) + 300;
  const payload = `${random}:${expiry}:${difficulty}`;
  const signature = await sha256(payload + ':FORMAL_FIXED_SECRET');
  return `${payload}:${signature}`;
}

export async function verifyPrePow(
  difficulty: number,
  challenge: string,
  nonce: number,
): Promise<boolean> {
  const parts = challenge.split(':');
  if (parts.length !== 2) return false;

  const timestamp = parseInt(parts[0], 10);
  const diffTimestamp = Math.floor(Date.now() / 1000) - timestamp;
  if (isNaN(timestamp) || diffTimestamp > 60 || diffTimestamp < 0) return false;
  if (parts[1] !== 'FIXED') return false;

  // TODO: check in redis if already used

  return verifyPow(difficulty, challenge, nonce);
}

export async function verifyFormalPow(
  challenge: string,
  post: string,
  nonce: number,
): Promise<boolean> {
  const parts = challenge.split(':');
  if (parts.length !== 4) return false;
  const random = parts[0];
  const expiry = parseInt(parts[1], 10);
  const difficulty = parseInt(parts[2], 10);
  const signature = parts[3];

  const verifySign = await sha256(`${random}:${expiry}:${difficulty}:FORMAL_FIXED_SECRET`);
  if (signature !== verifySign) return false;
  // TODO: signature in redis

  const now = Math.floor(Date.now() / 1000);
  if (isNaN(expiry) || now > expiry) return false;

  const ok = await verifyPow(difficulty, `${challenge}:${post}`, nonce);
  if (ok) {
    // TODO: redis
  }

  return ok;
}
