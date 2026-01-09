import type { GetCommentsResponse, AdminLoginResponse } from '@ziteh/yangchun-comment-shared';
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

export interface ApiService {
  ensureValidChallenge: () => Promise<boolean>;
  precomputeFormalPow: (post: string) => Promise<boolean>;
  getComments: (post: string) => Promise<GetCommentsResponse>;
  addComment: (
    post: string,
    pseudonym: string,
    msg: string,
    replyTo?: string,
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
  adminLogin: (username: string, password: string) => Promise<AdminLoginResponse | null>;
  checkAdminAuth: () => Promise<boolean>;
  adminLogout: () => Promise<boolean>;
}

// TODO HttpOnly Cookie?
export const createApiService = (apiUrl: string): ApiService => {
  const commentAuthMap = new Map<string, AuthInfo>();
  let formalChallenge: string | null = null;
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

  const ensureValidChallenge = async (): Promise<boolean> => {
    const prePow = await solvePrePow(PRE_POW_DIFFICULTY);
    if (prePow.nonce < 0) {
      console.error('Failed to solve pre-PoW');
      return false;
    }
    console.debug('Pre-PoW solved:', prePow);

    const newChallenge = await getFormalChallenge(prePow.challenge, prePow.nonce);
    if (!newChallenge) {
      console.error('Failed to get formal challenge');
      return false;
    }

    formalChallenge = newChallenge;
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

      console.debug('Formal PoW precomputed successfully, nonce:', nonce);
      return true;
    } catch (err) {
      console.error('Error precomputing formal PoW:', err);
      return false;
    }
  };

  const getComments = async (post: string): Promise<GetCommentsResponse> => {
    try {
      const url = new URL('/api/comments', apiUrl);
      url.searchParams.append('post', post);
      const res = await fetch(url, {
        credentials: 'include', // Include cookies to check admin status
      });
      const data = await res.json();
      return { comments: data.comments || [], isAdmin: data.isAdmin || false };
    } catch (err) {
      console.error('Error getting comments:', err);
      return { comments: [], isAdmin: false };
    }
  };

  const addComment = async (
    post: string,
    pseudonym: string,
    msg: string,
    replyTo?: string,
  ): Promise<string | null> => {
    try {
      const prePow = await solvePrePow(PRE_POW_DIFFICULTY);
      if (prePow.nonce < 0) {
        console.error('Failed to solve pre-PoW');
        return null;
      }
      console.debug('Pre-PoW solved:', prePow);

      const fChallenge = await getFormalChallenge(prePow.challenge, prePow.nonce);
      if (!fChallenge) {
        console.error('Failed to get formal challenge');
        return null;
      }
      console.debug('Using formal challenge:', fChallenge);
      formalChallenge = fChallenge;

      const difficulty = parseInt(fChallenge.split(':')[2], 10);
      console.debug('Solving formal PoW with difficulty:', difficulty);

      const fPowNonce = await solveFormalPow(difficulty, fChallenge, post);
      if (fPowNonce < 0) {
        console.error('Failed to solve formal PoW');
        throw new Error('Failed to solve proof-of-work. Please try again.');
      }
      console.debug('Formal PoW solved, nonce:', fPowNonce);

      const url = new URL('/api/comments', apiUrl);
      url.searchParams.append('post', post);
      url.searchParams.append('challenge', fChallenge);
      url.searchParams.append('nonce', fPowNonce.toString());

      // Get honeypot field if present
      const emailField = document.querySelector('input[name="email"]') as HTMLInputElement;
      // FIXME: directly from global DOM may break encapsulation
      const email = emailField ? emailField.value : '';

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Admin HttpOnly cookies
        body: JSON.stringify({
          pseudonym,
          msg,
          replyTo,
          email, // Include honeypot field
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

  const adminLogin = async (
    username: string,
    password: string,
  ): Promise<AdminLoginResponse | null> => {
    try {
      const url = new URL('/admin/login', apiUrl);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include', // Include cookies in request
      });

      if (res.ok) {
        const data = await res.json();
        return data as AdminLoginResponse;
      }
      console.error('Admin login failed:', res.status, res.statusText);
      return null;
    } catch (err) {
      console.error('Error during admin login:', err);
      return null;
    }
  };

  const checkAdminAuth = async (): Promise<boolean> => {
    try {
      const url = new URL('/admin/check', apiUrl);
      const res = await fetch(url, {
        method: 'GET',
        credentials: 'include', // Include cookies in request
      });
      return res.ok;
    } catch (err) {
      console.error('Error checking admin auth:', err);
      return false;
    }
  };

  const adminLogout = async (): Promise<boolean> => {
    try {
      const url = new URL('/admin/logout', apiUrl);
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include', // Include cookies in request
      });
      return res.ok;
    } catch (err) {
      console.error('Error during admin logout:', err);
      return false;
    }
  };

  return {
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
    adminLogin,
    checkAdminAuth,
    adminLogout,
  };
};
