import { adjectives, nouns } from './wordBank';

export async function generateSHA256Hash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function selectWordsFromHash(hash: string): { adjective: string; noun: string } {
  // Using the first 8 characters of the hash to select an adjective
  const adjIndex = parseInt(hash.substring(0, 8), 16) % adjectives.length;

  // Using the next 8 characters of the hash to select a noun
  const nounIndex = parseInt(hash.substring(8, 16), 16) % nouns.length;

  return {
    adjective: adjectives[adjIndex],
    noun: nouns[nounIndex],
  };
}

export async function generatePseudonymAndHash(originalName: string): Promise<{
  pseudonym: string;
  hash: string;
}> {
  const name = originalName.trim();
  if (name.length === 0) {
    return {
      pseudonym: '',
      hash: '',
    };
  }

  const hash = await generateSHA256Hash(name);
  const { adjective, noun } = selectWordsFromHash(hash);
  const pseudonym = `${adjective} ${noun}`;

  return {
    pseudonym,
    hash,
  };
}
