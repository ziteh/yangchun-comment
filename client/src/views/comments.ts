import { html, type TemplateResult } from 'lit';
import type { Comment } from '@ziteh/yangchun-comment-shared';
import type { CommentMap } from '../types';
import type { YangchunCommentElement } from '../element';

function getCommentCssClasses(isRoot: boolean) {
  const prefix = isRoot ? 'comment' : 'reply';
  return {
    item: prefix,
    header: `${prefix}-header ycc-flex ycc-flex-wrap`,
    name: `${prefix}-name`,
    time: `${prefix}-time`,
    content: `${prefix}-content`,
  };
}

function createCommentHeader(
  ctx: YangchunCommentElement,
  comment: Comment,
  css: ReturnType<typeof getCommentCssClasses>,
  replyToName: string | null,
  canEdit: boolean,
): TemplateResult {
  const isMy = ctx.isMyComment(comment);
  const isAdmin = comment.isAdmin;

  return html` <div class="${css.header}">
    <span class="${css.name}" title="${comment.id}">
      ${ctx.getDisplayName(comment)}
      ${isAdmin
        ? html`<span class="author-badge">${ctx.i18n$.t('author')}</span>`
        : isMy
          ? html`<span class="my-comment-badge">Me</span>`
          : ''}
    </span>
    <span
      class="${css.time}"
      title="${comment.modDate ? ctx.formatDate(comment.pubDate) : undefined}"
    >
      ${comment.modDate
        ? ctx.i18n$.t('modified') + ' ' + ctx.formatDate(comment.modDate)
        : ctx.formatDate(comment.pubDate)}
    </span>
    ${replyToName
      ? html`<span class="reply-to"
          >${ctx.i18n$.t('replyTo')}<span title="${comment.replyTo ?? ''}"
            >${replyToName}</span
          ></span
        >`
      : ''}
    ${canEdit
      ? html`<span class="comment-controls ycc-flex ycc-gap-xs">
          <button
            class="edit-button ycc-clickable ycc-transition ycc-transparent-bg ycc-reset-button"
            @click=${() => ctx.handleEdit(comment)}
          >
            ${ctx.i18n$.t('edit')}
          </button>
          <button
            class="delete-button ycc-clickable ycc-transition ycc-transparent-bg ycc-reset-button"
            @click=${() => ctx.handleDelete(comment.id)}
          >
            ${ctx.i18n$.t('delete')}
          </button>
        </span>`
      : ''}
  </div>`;
}

function createCommentContent(
  ctx: YangchunCommentElement,
  comment: Comment,
  contentClass: string,
): TemplateResult {
  return html`<div class="${contentClass}">${ctx.renderMarkdown(comment.msg)}</div>`;
}

function createCommentActions(ctx: YangchunCommentElement, comment: Comment): TemplateResult {
  return html`<button
    class="reply-button ycc-clickable ycc-transition ycc-transparent-bg ycc-reset-button"
    @click=${() => ctx.setReplyTo(comment.id)}
  >
    ${ctx.i18n$.t('reply')}
  </button>`;
}

function createCommentItemTemplate(
  ctx: YangchunCommentElement,
  comment: Comment,
  isRoot = false,
  replyToName: string | null = null,
  allReplies: Comment[] | null = null,
  commentMap: CommentMap | null = null,
): TemplateResult {
  const css = getCommentCssClasses(isRoot);
  const canEdit = ctx.canEditComment(comment.id);

  return html` <div class="${css.item}" ${isRoot ? `data-id="${comment.id}"` : ''}>
    ${createCommentHeader(ctx, comment, css, replyToName, canEdit)}
    ${createCommentContent(ctx, comment, css.content)} ${createCommentActions(ctx, comment)}
    ${isRoot
      ? html`<div class="replies">
          ${allReplies
            ? allReplies.map((reply) => {
                const replyToComment =
                  reply.replyTo && commentMap ? commentMap[reply.replyTo] : undefined;
                const replyToName = replyToComment ? ctx.getDisplayName(replyToComment) : '';
                return createCommentItemTemplate(ctx, reply, false, replyToName);
              })
            : ''}
        </div>`
      : ''}
  </div>`;
}

function processComments(ctx: YangchunCommentElement, data: Comment[], commentMap: CommentMap) {
  const roots = data.filter((c) => !c.replyTo);
  const replyMap: Record<string, Comment[]> = {};

  data.forEach((c) => {
    if (c.replyTo) {
      (replyMap[c.replyTo] ||= []).push(c);
    }
  });
  const getAll = (id: string): Comment[] => {
    const all: Comment[] = [];
    const q: Comment[] = [...(replyMap[id] || [])];
    while (q.length) {
      const r = q.shift();
      if (!r) break;
      all.push(r);
      const children = replyMap[r.id] || [];
      if (children.length) q.push(...children);
    }
    return all;
  };

  return roots.map((root) =>
    createCommentItemTemplate(ctx, root, true, null, getAll(root.id), commentMap),
  );
}

export function createCommentsTemplate(ctx: YangchunCommentElement): TemplateResult {
  const comments = ctx.comments$;
  if (comments.length === 0) {
    return html`<div id="comments">
      <div class="no-comments-message">${ctx.i18n$.t('noComments')}</div>
    </div>`;
  }
  return html`<div id="comments">${processComments(ctx, comments, ctx.commentMap$)}</div>`;
}
