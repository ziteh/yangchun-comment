interface PowRequest {
  type: 'solve';
  difficulty: number;
  challenge: string;
  maxRetries: number;
}

interface PowResponse {
  type: 'success' | 'failure';
  nonce: number;
}

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

async function solvePow(
  difficulty: number,
  challenge: string,
  maxRetries: number,
): Promise<number> {
  let nonce = 0;
  const targetPrefix = '0'.repeat(difficulty);

  let retries = 0;
  while (retries++ < maxRetries) {
    const hash = await sha256(`${challenge}:${nonce}`);
    if (hash.startsWith(targetPrefix)) {
      return nonce;
    }
    nonce++;
  }
  return -1; // Indicate failure to solve PoW
}

self.onmessage = async (e: MessageEvent<PowRequest>) => {
  const { type, difficulty, challenge, maxRetries } = e.data;

  if (type === 'solve') {
    const nonce = await solvePow(difficulty, challenge, maxRetries);
    const response: PowResponse = {
      type: nonce >= 0 ? 'success' : 'failure',
      nonce,
    };
    self.postMessage(response);
  }
};
