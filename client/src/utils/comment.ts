import type { Comment } from '@ziteh/yangchun-comment-shared';

export function sortCommentsByDate(comments: Comment[], newFirst: boolean): Comment[] {
  return comments.slice().sort((a, b) => {
    if (newFirst) {
      return b.pubDate - a.pubDate;
    } else {
      return a.pubDate - b.pubDate;
    }
  });
}

export function filterRootComments(comments: Comment[]): Comment[] {
  return comments.filter((cmt) => !cmt.replyTo);
}

export function filterReplyComments(comments: Comment[], replyToId: string): Comment[] {
  return comments.filter((cmt) => cmt.replyTo === replyToId);
}

export function findRootComment(comments: Comment[], commentId: string): Comment | undefined {
  if (!commentId) return undefined;

  const currentComment = comments.find((cmt) => cmt.id === commentId);
  if (!currentComment) return undefined;

  let parentComment: Comment | undefined = currentComment;
  while (parentComment) {
    const parentCommentId: string | undefined = parentComment.replyTo;
    if (!parentCommentId) break;

    const nextParent: Comment | undefined = comments.find((cmt) => cmt.id === parentCommentId);
    if (!nextParent) break;

    parentComment = nextParent;
  }

  return parentComment;
}

export function findReplyComments(comments: Comment[], rootCommentId: string): Comment[] {
  if (!comments) return [];
  if (!rootCommentId) return [];
  if (!comments.find((cmt) => cmt.id === rootCommentId)) return [];

  const replyComments: Comment[] = [];

  function collectReplies(parentId: string) {
    const directReplies = comments.filter((cmt) => cmt.replyTo === parentId);
    for (const reply of directReplies) {
      replyComments.push(reply);
      collectReplies(reply.id);
    }
  }

  collectReplies(rootCommentId);
  return replyComments;
}
