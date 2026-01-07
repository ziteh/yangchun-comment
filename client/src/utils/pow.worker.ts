interface PowRequest {
  requestId: number;
  type: 'solve';
  difficulty: number;
  challenge: string;
  maxRetries: number;
}

interface PowResponse {
  requestId: number;
  success: boolean;
  nonce: number;
  error?: string;
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
  const { requestId, type, difficulty, challenge, maxRetries } = e.data;

  if (type === 'solve') {
    try {
      const nonce = await solvePow(difficulty, challenge, maxRetries);
      const response: PowResponse = {
        requestId,
        success: nonce >= 0,
        nonce,
      };
      self.postMessage(response);
    } catch (error) {
      const response: PowResponse = {
        requestId,
        success: false,
        nonce: -1,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      self.postMessage(response);
    }
  }
};
