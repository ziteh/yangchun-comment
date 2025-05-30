import type { Comment } from '@cf-comment/shared';

type AuthInfo = {
  id: string;
  timestamp: number;
  token: string;
};

// TODO HttpOnly Cookie?
export const createApiService = (apiUrl: string) => {
  const commentAuthMap: Map<string, AuthInfo> = new Map();

  const getComments = async (post: string): Promise<Comment[]> => {
    const res = await fetch(`${apiUrl}/comments?post=${post}`);
    return await res.json();
  };

  const addComment = async (
    post: string,
    name: string,
    message: string,
    replyTo: string | null,
  ): Promise<boolean> => {
    try {
      const res = await fetch(`${apiUrl}/comments?post=${post}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          msg: message,
          replyTo,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        saveAuthInfo(data.id, data.timestamp, data.token);
        return true;
      }
      return false;
    } catch (_err) {
      return false;
    }
  };

  const updateComment = async (
    post: string,
    commentId: string,
    name: string,
    message: string,
  ): Promise<boolean> => {
    const authInfo = getAuthInfo(commentId);
    if (!authInfo) return false;

    try {
      const response = await fetch(`${apiUrl}/comments?post=${post}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: authInfo.id,
          timestamp: authInfo.timestamp,
          token: authInfo.token,
          name,
          msg: message,
        }),
      });

      return response.ok;
    } catch (_err) {
      return false;
    }
  };

  const deleteComment = async (post: string, commentId: string): Promise<boolean> => {
    const authInfo = getAuthInfo(commentId);
    if (!authInfo) return false;

    try {
      const response = await fetch(`${apiUrl}/comments?post=${post}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: authInfo.id,
          timestamp: authInfo.timestamp,
          token: authInfo.token,
        }),
      });

      if (response.ok) {
        removeAuthInfo(commentId);
        return true;
      }
      return false;
    } catch (_err) {
      return false;
    }
  };

  const saveAuthInfo = (id: string, timestamp: number, token: string): void => {
    commentAuthMap.set(id, { id, timestamp, token });

    // optionally store in sessionStorage for persistence across page reloads
    const encryptedInfo = btoa(JSON.stringify({ id, timestamp }));
    sessionStorage.setItem(`comment_auth_${id}`, encryptedInfo);
  };

  const getAuthInfo = (commentId: string): AuthInfo | null => {
    const authInfo = commentAuthMap.get(commentId);
    if (authInfo) return authInfo;

    return null;
  };

  const removeAuthInfo = (commentId: string): void => {
    commentAuthMap.delete(commentId);
    sessionStorage.removeItem(`comment_auth_${commentId}`);
  };

  const canEditComment = (commentId: string): boolean => {
    return !!getAuthInfo(commentId);
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
  };
};
