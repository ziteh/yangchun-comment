import type { Comment } from '@ziteh/yangchun-comment-shared';

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

  const getComments = async (post: string): Promise<Comment[]> => {
    const url = new URL('/api/comments', apiUrl);
    url.searchParams.append('post', post);
    const res = await fetch(url);
    return await res.json();
  };

  const addComment = async (
    post: string,
    pseudonym: string,
    msg: string,
    replyTo: string | null,
  ): Promise<string | null> => {
    try {
      const url = new URL('/api/comments', apiUrl);
      url.searchParams.append('post', post); // Get honeypot field if present
      const websiteField = document.querySelector('input[name="website"]') as HTMLInputElement;
      // const websiteField = document.querySelector('input[name="website"]') as HTMLInputElement;
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
      return null;
    } catch {
      return null;
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
