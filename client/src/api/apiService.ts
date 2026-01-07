import type { Comment } from '@ziteh/yangchun-comment-shared';
import { solvePrePow, solveFormalPow } from '../utils/pow';

export interface AuthInfo {
  timestamp: number;
  token: string;
}

export interface CommentAuthInfo {
  id: string;
  timestamp: number;
  token: string;
}

export interface CommentsResponse {
  comments: Comment[];
  challenge: string | null;
}

export interface ApiService {
  initChallenge: (post: string) => Promise<void>;
  ensureValidChallenge: () => Promise<boolean>;
  precomputeFormalPow: (post: string) => Promise<boolean>;
  getComments: (post: string) => Promise<Comment[]>;
  addComment: (
    post: string,
    pseudonym: string,
    msg: string,
    replyTo: string | null,
  ) => Promise<string | null>;
  updateComment: (
    post: string,
    commentId: string,
    pseudonym: string,
    msg: string,
  ) => Promise<boolean>;
  deleteComment: (post: string, commentId: string) => Promise<boolean>;
  saveAuthInfo: (id: string, timestamp: number, token: string) => void;
  getAuthInfo: (commentId: string) => CommentAuthInfo | null;
  removeAuthInfo: (commentId: string) => void;
  canEditComment: (commentId: string) => boolean;
  saveMyCommentId: (commentId: string) => void;
  isMyComment: (commentId: string) => boolean;
}

// TODO HttpOnly Cookie?
export const createApiService = (apiUrl: string): ApiService => {
  const commentAuthMap = new Map<string, AuthInfo>();
  let formalChallenge: string | null = null;
  let precomputedNonce: { challenge: string; post: string; nonce: number } | null = null;
  const PRE_POW_DIFFICULTY = 2;

  const getFormalChallenge = async (challenge: string, nonce: number): Promise<string | null> => {
    try {
      const url = new URL('/api/pow/formal-challenge', apiUrl);
      url.searchParams.append('challenge', challenge);
      url.searchParams.append('nonce', nonce.toString());

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return data.challenge;
      }
      console.error('Failed to get formal challenge:', res.status, res.statusText);
      return null;
    } catch (err) {
      console.error('Error getting formal challenge:', err);
      return null;
    }
  };

  const initChallenge = async (post: string): Promise<void> => {
    console.debug('Initializing formal challenge...', post); // TODO: post?
    try {
      console.debug('Solving Pre-PoW with difficulty', PRE_POW_DIFFICULTY, '...');
      const prePow = await solvePrePow(PRE_POW_DIFFICULTY);

      if (prePow.nonce < 0) {
        console.warn('Failed to solve pre-PoW, will try again when needed');
        formalChallenge = null;
        return;
      }

      console.debug('Pre-PoW solved:', prePow);
      const challenge = await getFormalChallenge(prePow.challenge, prePow.nonce);

      if (challenge) {
        formalChallenge = challenge;
        console.debug('Formal challenge received:', challenge);
      } else {
        formalChallenge = null;
      }
    } catch (err) {
      console.error('Error initializing challenge:', err);
      formalChallenge = null;
    }
  };

  const ensureValidChallenge = async (): Promise<boolean> => {
    if (!formalChallenge) {
      console.warn('No formal challenge available');
      return false;
    }

    // Check if challenge is expired
    const parts = formalChallenge.split(':');
    if (parts.length >= 4) {
      const expiry = parseInt(parts[1], 10) - 10;
      const now = Math.floor(Date.now() / 1000);

      if (now >= expiry) {
        console.debug('Formal challenge expired, getting new challenge...');

        const prePow = await solvePrePow(PRE_POW_DIFFICULTY);
        if (prePow.nonce < 0) {
          console.error('Failed to solve pre-PoW');
          return false;
        }

        console.debug('Pre-PoW solved:', prePow);
        const newChallenge = await getFormalChallenge(prePow.challenge, prePow.nonce);

        if (!newChallenge) {
          console.error('Failed to get new formal challenge');
          return false;
        }

        formalChallenge = newChallenge;
        console.debug('New formal challenge received:', formalChallenge);
      }
    } else {
      console.error('Invalid formal challenge format');
      return false;
    }

    return true;
  };

  const precomputeFormalPow = async (post: string): Promise<boolean> => {
    try {
      const isValid = await ensureValidChallenge();
      if (!isValid || !formalChallenge) {
        console.warn('No valid challenge available for precomputing PoW');
        return false;
      }

      const difficulty = parseInt(formalChallenge.split(':')[2], 10);
      console.debug('Precomputing formal PoW with difficulty:', difficulty);

      const nonce = await solveFormalPow(difficulty, formalChallenge, post);
      if (nonce < 0) {
        console.error('Failed to precompute formal PoW');
        return false;
      }

      precomputedNonce = {
        challenge: formalChallenge,
        post,
        nonce,
      };
      console.debug('Formal PoW precomputed successfully, nonce:', nonce);
      return true;
    } catch (err) {
      console.error('Error precomputing formal PoW:', err);
      return false;
    }
  };

  const getComments = async (post: string): Promise<Comment[]> => {
    try {
      console.debug('Solving Pre-PoW for getComments...');
      const prePow = await solvePrePow(PRE_POW_DIFFICULTY);

      const url = new URL('/api/comments', apiUrl);
      url.searchParams.append('post', post);

      if (prePow.nonce >= 0) {
        url.searchParams.append('challenge', prePow.challenge);
        url.searchParams.append('nonce', prePow.nonce.toString());
      } else {
        console.warn('Failed to solve pre-PoW, fetching comments without challenge');
      }

      const res = await fetch(url);
      const data = await res.json();

      // Update formal challenge if provided
      if (data.challenge) {
        formalChallenge = data.challenge;
        console.debug('Formal challenge updated from getComments:', formalChallenge);
      }

      return data.comments || [];
    } catch (err) {
      console.error('Error getting comments:', err);
      return [];
    }
  };

  const addComment = async (
    post: string,
    pseudonym: string,
    msg: string,
    replyTo: string | null,
  ): Promise<string | null> => {
    try {
      // Ensure we have a valid challenge
      const isValid = await ensureValidChallenge();
      if (!isValid || !formalChallenge) {
        console.error('No valid challenge available');
        throw new Error('Challenge not ready. Please try again.');
      }

      console.debug('Using formal challenge:', formalChallenge);

      let fPowNonce: number;

      // Check if we have a valid precomputed nonce
      if (
        precomputedNonce &&
        precomputedNonce.challenge === formalChallenge &&
        precomputedNonce.post === post
      ) {
        console.debug('Using precomputed formal PoW nonce:', precomputedNonce.nonce);
        fPowNonce = precomputedNonce.nonce;
        precomputedNonce = null; // Clear after use
      } else {
        // Solve formal PoW on demand
        const difficulty = parseInt(formalChallenge.split(':')[2], 10);
        console.debug('Solving formal PoW with difficulty:', difficulty);

        fPowNonce = await solveFormalPow(difficulty, formalChallenge, post);
        if (fPowNonce < 0) {
          console.error('Failed to solve formal PoW');
          throw new Error('Failed to solve proof-of-work. Please try again.');
        }
      }
      console.debug('Formal PoW solved, nonce:', fPowNonce);

      const url = new URL('/api/comments', apiUrl);
      url.searchParams.append('post', post);
      url.searchParams.append('challenge', formalChallenge);
      url.searchParams.append('nonce', fPowNonce.toString());

      // Get honeypot field if present
      const websiteField = document.querySelector('input[name="website"]') as HTMLInputElement;
      // FIXME: directly from global DOM may break encapsulation
      const website = websiteField ? websiteField.value : '';

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pseudonym,
          msg,
          replyTo,
          website, // Include honeypot field
        }),
      });

      if (res.ok) {
        const data = await res.json();
        saveAuthInfo(data.id, data.timestamp, data.token);
        saveMyCommentId(data.id);
        return data.id;
      }
      console.error('Failed to add comment:', res.status, res.statusText);
      return null;
    } catch (err) {
      console.error('Error adding comment:', err);
      throw err;
    }
  };

  const updateComment = async (
    post: string,
    commentId: string,
    pseudonym: string,
    msg: string,
  ): Promise<boolean> => {
    const authInfo = getAuthInfo(commentId);
    if (!authInfo) return false;

    try {
      const url = new URL('/api/comments', apiUrl);
      url.searchParams.append('post', post);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Comment-ID': authInfo.id,
          'X-Comment-Token': authInfo.token,
          'X-Comment-Timestamp': authInfo.timestamp.toString(),
        },
        body: JSON.stringify({
          pseudonym,
          msg,
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  };

  const deleteComment = async (post: string, commentId: string): Promise<boolean> => {
    const authInfo = getAuthInfo(commentId);
    if (!authInfo) return false;

    try {
      const url = new URL('/api/comments', apiUrl);
      url.searchParams.append('post', post);

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Comment-ID': authInfo.id,
          'X-Comment-Token': authInfo.token,
          'X-Comment-Timestamp': authInfo.timestamp.toString(),
        },
      });

      if (response.ok) {
        removeAuthInfo(commentId);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const saveAuthInfo = (id: string, timestamp: number, token: string): void => {
    commentAuthMap.set(id, { timestamp, token });

    // optionally store in sessionStorage for persistence across page reloads
    const encryptedInfo = btoa(JSON.stringify({ timestamp }));
    sessionStorage.setItem(`comment_auth_${id}`, encryptedInfo);
  };

  const getAuthInfo = (commentId: string): CommentAuthInfo | null => {
    const authInfo = commentAuthMap.get(commentId);
    if (authInfo) return { id: commentId, ...authInfo };

    return null;
  };

  const removeAuthInfo = (commentId: string): void => {
    commentAuthMap.delete(commentId);
    sessionStorage.removeItem(`comment_auth_${commentId}`);
  };

  const canEditComment = (commentId: string): boolean => {
    return !!getAuthInfo(commentId);
  };

  const saveMyCommentId = (commentId: string): void => {
    try {
      const myIds = new Set(JSON.parse(localStorage.getItem('my_comment_ids') || '[]'));
      myIds.add(commentId);
      localStorage.setItem('my_comment_ids', JSON.stringify(Array.from(myIds)));
    } catch (e) {
      console.warn('Failed to save my comment ID:', e);
    }
  };

  const isMyComment = (commentId: string): boolean => {
    try {
      const myIds = JSON.parse(localStorage.getItem('my_comment_ids') || '[]');
      return myIds.includes(commentId);
    } catch (e) {
      console.warn('Failed to check if my comment:', e);
      return false;
    }
  };

  return {
    initChallenge,
    ensureValidChallenge,
    precomputeFormalPow,
    getComments,
    addComment,
    updateComment,
    deleteComment,
    saveAuthInfo,
    getAuthInfo,
    removeAuthInfo,
    canEditComment,
    saveMyCommentId,
    isMyComment,
  };
};
