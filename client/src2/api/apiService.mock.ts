import type { Comment } from '@ziteh/yangchun-comment-shared';
import type { ApiService, AuthInfo, CommentAuthInfo } from './apiService';

export const createMockApiService = (): ApiService => {
  const date = Date.now(); // test

  const mockComments = new Map<string, Comment[]>([
    [
      'default-post',
      [
        // test
        {
          pseudonym: 'Alice',
          id: 'a0',
          msg: 'a0',
          pubDate: date,
        },
        {
          pseudonym: 'Alice',
          id: 'a1',
          msg: 'a1',
          pubDate: date + 1000,
          replyTo: 'a0',
        },
        {
          pseudonym: 'Alice',
          id: 'b0',
          msg: 'b0',
          pubDate: date + 2000,
          modDate: date + 3000,
          isAdmin: true,
        },
        {
          pseudonym: 'Alice',
          id: 'b1',
          msg: 'b1',
          pubDate: date - 25 * 5 * 7 * 24 * 60 * 60 * 1000,
          replyTo: 'b0',
        },
        {
          pseudonym: 'Alice',
          id: 'b2',
          msg: 'b2',
          pubDate: date + 4000,
          replyTo: 'b0',
        },
        {
          pseudonym: 'Alice',
          id: 'b21',
          msg: 'b21',
          pubDate: date + 6000,
          replyTo: 'b2',
        },
        {
          pseudonym: 'Alice',
          id: 'b22',
          msg: 'b22',
          pubDate: date + 6000,
          replyTo: 'b21',
        },
        {
          id: 'b23',
          msg: 'b23',
          pubDate: date + 7000,
          replyTo: 'b2',
        },
      ],
    ],
  ]);
  const commentAuthMap = new Map<string, AuthInfo>();
  let commentIdCounter = 1;

  const simulateNetworkDelay = (ms = 100) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  const getComments: ApiService['getComments'] = async (post) => {
    await simulateNetworkDelay();
    return [...(mockComments.get(post) || [])];
  };

  const addComment: ApiService['addComment'] = async (post, pseudonym, nameHash, msg, replyTo) => {
    await simulateNetworkDelay();

    const now = Date.now();
    const newComment: Comment = {
      id: `mock-${commentIdCounter++}`,
      pseudonym,
      nameHash,
      msg,
      replyTo: replyTo ?? undefined,
      pubDate: now,
      modDate: now,
    };

    const postComments = mockComments.get(post) || [];
    postComments.push(newComment);
    mockComments.set(post, postComments);

    // Save auth info for this comment
    const timestamp = Date.now();
    const token = `mock-token-${newComment.id}`;
    saveAuthInfo(newComment.id, timestamp, token);

    return newComment.id;
  };

  const updateComment: ApiService['updateComment'] = async (
    post,
    commentId,
    pseudonym,
    nameHash,
    msg,
  ) => {
    const authInfo = getAuthInfo(commentId);
    if (!authInfo) return false;

    simulateNetworkDelay();

    const postComments = mockComments.get(post);
    if (!postComments) return false;

    const commentIndex = postComments.findIndex((c) => c.id === commentId);
    if (commentIndex === -1) return false;

    postComments[commentIndex] = {
      ...postComments[commentIndex],
      pseudonym,
      nameHash,
      msg,
      modDate: Date.now(),
    };

    mockComments.set(post, postComments);
    return true;
  };

  const deleteComment: ApiService['deleteComment'] = async (post, commentId) => {
    const authInfo = getAuthInfo(commentId);
    if (!authInfo) return false;

    simulateNetworkDelay();

    const postComments = mockComments.get(post);
    if (!postComments) return false;

    const filteredComments = postComments.filter((c) => c.id !== commentId);
    if (filteredComments.length === postComments.length) return false;

    mockComments.set(post, filteredComments);
    removeAuthInfo(commentId);
    return true;
  };

  const saveAuthInfo: ApiService['saveAuthInfo'] = (id, timestamp, token) => {
    commentAuthMap.set(id, { timestamp, token });
  };

  const getAuthInfo: ApiService['getAuthInfo'] = (commentId): CommentAuthInfo | null => {
    const authInfo = commentAuthMap.get(commentId);
    if (authInfo) return { id: commentId, ...authInfo };
    return null;
  };

  const removeAuthInfo: ApiService['removeAuthInfo'] = (commentId) => {
    commentAuthMap.delete(commentId);
  };

  const canEditComment: ApiService['canEditComment'] = (commentId) => {
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
