const SOLVE_POW_MAX_RETRIES = 1000000;
const PRE_POW_TIME_WINDOW = 60; // seconds
const FORMAL_POW_EXPIRY = 300; // seconds
const PRE_POW_PAYLOAD = 'FIXED';
const FORMAL_SECRET = 'FORMAL_FIXED_SECRET'; // TODO: move to env

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Inline worker code as string to bundle everything together
const workerCode = `
async function sha256(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

async function solvePow(difficulty, challenge, maxRetries) {
  let nonce = 0;
  const targetPrefix = '0'.repeat(difficulty);
  let retries = 0;

  while (retries++ < maxRetries) {
    const hash = await sha256(challenge + ':' + nonce);
    if (hash.startsWith(targetPrefix)) {
      return nonce;
    }
    nonce++;
  }
  return -1;
}

self.onmessage = async (e) => {
  const { requestId, type, difficulty, challenge, maxRetries } = e.data;
  if (type === 'solve') {
    try {
      const nonce = await solvePow(difficulty, challenge, maxRetries);
      self.postMessage({
        requestId,
        success: nonce >= 0,
        nonce,
      });
    } catch (error) {
      self.postMessage({
        requestId,
        success: false,
        nonce: -1,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
};
`;

let powWorker: Worker | null = null;
let requestIdCounter = 0;
const pendingRequests = new Map<number, (nonce: number) => void>();

function getPowWorker(): Worker {
  if (!powWorker) {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    powWorker = new Worker(workerUrl);

    powWorker.addEventListener('message', (e: MessageEvent) => {
      const { requestId, success, nonce, error } = e.data;
      const resolver = pendingRequests.get(requestId);

      if (resolver) {
        pendingRequests.delete(requestId);
        if (error) {
          console.error('PoW Worker error:', error);
          resolver(-1);
        } else if (success) {
          resolver(nonce);
        } else {
          console.warn('Failed to solve PoW within max retries');
          resolver(-1);
        }
      }
    });

    powWorker.addEventListener('error', (e) => {
      console.error('PoW Worker error:', e.message);
      pendingRequests.forEach((resolver) => resolver(-1));
      pendingRequests.clear();
    });
  }
  return powWorker;
}

async function solvePow(difficulty: number, challenge: string): Promise<number> {
  return new Promise((resolve) => {
    const worker = getPowWorker();
    const requestId = requestIdCounter++;

    pendingRequests.set(requestId, resolve);

    worker.postMessage({
      requestId,
      type: 'solve',
      difficulty,
      challenge,
      maxRetries: SOLVE_POW_MAX_RETRIES,
    });
  });
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
  const expiry = Math.floor(Date.now() / 1000) + FORMAL_POW_EXPIRY;
  const payload = `${random}:${expiry}:${difficulty}`;
  const signature = await sha256(payload + ':' + FORMAL_SECRET);
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
  if (isNaN(timestamp) || diffTimestamp > PRE_POW_TIME_WINDOW || diffTimestamp < 0) return false;
  if (parts[1] !== PRE_POW_PAYLOAD) return false;

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

  const verifySign = await sha256(`${random}:${expiry}:${difficulty}:${FORMAL_SECRET}`);
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

export function cleanupPowWorker(): void {
  if (powWorker) {
    pendingRequests.forEach((resolver) => resolver(-1));
    pendingRequests.clear();

    powWorker.terminate();
    powWorker = null;
  }
}
