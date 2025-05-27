import DOMPurify from 'dompurify';
import snarkdown from 'snarkdown';
import { html, render, type TemplateResult } from 'lit-html';
import { until } from 'lit-html/directives/until.js';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import type { Comment } from '@cf-comment/shared';
import './comment.css';

type AuthInfo = {
  id: string;
  timestamp: number;
  token: string;
};

type CommentMap = {
  [id: string]: Comment;
};

const API_URL = 'http://localhost:8787/api';
const POST = '/blog/my-post';
const ANONYMOUS = 'Anonymous';

let currentReplyTo: string | null = null;
let previewText: string = '';
let editingComment: Comment | null = null;

function saveCommentAuthInfo(data: {
  id: string;
  timestamp: number;
  token: string;
}): AuthInfo {
  const authInfo: AuthInfo = {
    id: data.id,
    timestamp: data.timestamp,
    token: data.token,
  };

  sessionStorage.setItem(`comment_${data.id}`, JSON.stringify(authInfo));
  return authInfo;
}

function getCommentAuthInfo(commentId: string): AuthInfo | null {
  const authInfoStr = sessionStorage.getItem(`comment_${commentId}`);
  return authInfoStr ? JSON.parse(authInfoStr) : null;
}

function canEditComment(commentId: string): boolean {
  return !!getCommentAuthInfo(commentId);
}

function renderMarkdown(md: string): ReturnType<typeof unsafeHTML> {
  return unsafeHTML(DOMPurify.sanitize(snarkdown(md || '')));
}
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  let hour = date.getHours();
  const minute = String(date.getMinutes()).padStart(2, '0');
  const period = hour >= 12 ? 'PM' : 'AM';

  hour = hour % 12;
  if (hour === 0) hour = 12; // 0 => 12 AM or 12 PM
  const h = String(hour).padStart(2, '0');

  return `${y}/${m}/${d} ${h}:${minute} ${period}`;
}

function getDisplayName(comment: Comment | undefined): string {
  return comment?.name || ANONYMOUS;
}

function setReplyTo(commentId: string): void {
  currentReplyTo = commentId;
  renderApp();
}

function cancelReply(): void {
  currentReplyTo = null;
  renderApp();
}

function handleInputChange(e: Event): void {
  const target = e.target as HTMLInputElement;
  previewText = target.value;
  renderApp();
}

async function loadComments(): Promise<Comment[]> {
  const res = await fetch(`${API_URL}/comments?post=${POST}`);
  return await res.json();
}

function createCommentItemTemplate(
  comment: Comment,
  isRoot: boolean = false,
  replyToName: string | null = null,
  allReplies: Comment[] | null = null,
  commentMap: CommentMap | null = null,
): TemplateResult<1> {
  const className = isRoot ? 'comment' : 'reply';
  const headerClass = isRoot ? 'comment-header' : 'reply-header';
  const nameClass = isRoot ? 'comment-name' : 'reply-name';
  const timeClass = isRoot ? 'comment-time' : 'reply-time';
  const contentClass = isRoot ? 'comment-content' : 'reply-content';
  const canEdit = canEditComment(comment.id);

  return html`
    <div class="${className}" ${isRoot ? `data-id="${comment.id}"` : ''}>
      <div class="${headerClass}">
        <span class="${nameClass}" title="${comment.id}"
          >${getDisplayName(comment)}</span
        >
        <span class="${timeClass}">${formatDate(comment.pubDate)}</span>
        ${replyToName
          ? html`<span class="reply-to"
              >回覆給
              <span title="${comment.replyTo ?? ''}">${replyToName}</span></span
            >`
          : ''}
        ${canEdit
          ? html`<span class="comment-controls">
              <button class="edit-button" @click=${() => handleEdit(comment)}>
                編輯
              </button>
              <button
                class="delete-button"
                @click=${() => handleDelete(comment.id)}
              >
                刪除
              </button>
            </span>`
          : ''}
      </div>
      <div class="${contentClass}">${renderMarkdown(comment.msg)}</div>
      <button class="reply-button" @click=${() => setReplyTo(comment.id)}>
        回覆
      </button>
      ${isRoot && allReplies
        ? html`<div class="replies">
            ${allReplies.map((reply) => {
              const replyToComment =
                reply.replyTo && commentMap
                  ? commentMap[reply.replyTo]
                  : undefined;
              const replyToName = replyToComment
                ? getDisplayName(replyToComment)
                : '';
              return createCommentItemTemplate(reply, false, replyToName);
            })}
          </div>`
        : isRoot
        ? html`<div class="replies"></div>`
        : ''}
    </div>
  `;
}

function createCommentTemplate(
  rootComment: Comment,
  allReplies: Comment[],
  commentMap: CommentMap,
) {
  return createCommentItemTemplate(
    rootComment,
    true,
    null,
    allReplies,
    commentMap,
  );
}

function processComments(data: Comment[]) {
  // no replyTo means it's a root comment
  const rootComments = data.filter((c) => !c.replyTo);

  const replyMap: Record<string, Comment[]> = {};
  data.forEach((comment) => {
    if (comment.replyTo) {
      if (!replyMap[comment.replyTo]) {
        replyMap[comment.replyTo] = [];
      }
      replyMap[comment.replyTo].push(comment);
    }
  });

  function getAllReplies(commentId: string): Comment[] {
    const allReplies: Comment[] = [];
    const queue = [...(replyMap[commentId] || [])];

    while (queue.length > 0) {
      const reply = queue.shift();
      if (reply) {
        allReplies.push(reply);

        const childReplies = replyMap[reply.id] || [];
        queue.push(...childReplies);
      }
    }

    return allReplies;
  }

  return rootComments.map((rootComment) => {
    const allReplies = getAllReplies(rootComment.id);
    return createCommentTemplate(rootComment, allReplies, commentMap);
  });
}
async function handleSubmit(e: SubmitEvent): Promise<void> {
  e.preventDefault();
  const formData = new FormData(e.target as HTMLFormElement);

  if (editingComment) {
    const authInfo = getCommentAuthInfo(editingComment.id);
    if (!authInfo) {
      alert('無法編輯此評論，權限已過期');
      return;
    }

    const response = await fetch(`${API_URL}/comments?post=${POST}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: authInfo.id,
        timestamp: authInfo.timestamp,
        token: authInfo.token,
        name: formData.get('name'),
        msg: formData.get('message'),
      }),
    });

    if (response.ok) {
      (e.target as HTMLFormElement).reset();
      previewText = '';
      editingComment = null;
    } else {
      alert('編輯評論失敗，可能權限已過期');
    }
  } else {
    const response = await fetch(`${API_URL}/comments?post=${POST}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        msg: formData.get('message'),
        replyTo: currentReplyTo,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      saveCommentAuthInfo(data);

      (e.target as HTMLFormElement).reset();
      previewText = '';
      currentReplyTo = null;
    } else {
      alert('發送評論失敗');
    }
  }

  comments.length = 0;
  renderApp();
}

async function handleDelete(commentId: string): Promise<void> {
  if (!confirm('確定要刪除此評論嗎?')) return;

  const authInfo = getCommentAuthInfo(commentId);
  if (!authInfo) {
    alert('無法刪除此評論，權限已過期');
    return;
  }

  const response = await fetch(`${API_URL}/comments?post=${POST}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: authInfo.id,
      timestamp: authInfo.timestamp,
      token: authInfo.token,
    }),
  });

  if (response.ok) {
    sessionStorage.removeItem(`comment_${commentId}`);

    comments.length = 0;
    renderApp();
  } else {
    alert('刪除評論失敗，可能權限已過期');
  }
}

function handleEdit(comment: Comment): void {
  editingComment = comment;
  const nameInput = document.querySelector(
    '#comment-form input[name="name"]',
  ) as HTMLInputElement;
  const messageInput = document.querySelector(
    '#comment-form textarea[name="message"]',
  ) as HTMLTextAreaElement;

  if (nameInput) {
    nameInput.value = comment.name || '';
  }

  if (messageInput) {
    messageInput.value = comment.msg || '';
  }

  previewText = comment.msg || '';

  const form = document.querySelector('#comment-form');
  if (form) {
    form.scrollIntoView({ behavior: 'smooth' });
  }

  renderApp();
}

function cancelEdit(): void {
  editingComment = null;
  const form = document.querySelector('#comment-form') as HTMLFormElement;
  if (form) {
    form.reset();
  }
  previewText = '';
  renderApp();
}

function createFormTemplate() {
  return html`
    <form id="comment-form" @submit=${handleSubmit}>
      <input type="text" name="name" placeholder="姓名 (選填)" />
      <textarea
        name="message"
        placeholder="留言內容..."
        required
        @input=${handleInputChange}
      ></textarea>
      ${currentReplyTo && commentMap[currentReplyTo]
        ? html`<div id="reply-info">
            回覆給:
            <span id="reply-to-name"
              >${getDisplayName(commentMap[currentReplyTo])}</span
            >
            <button type="button" @click=${cancelReply}>取消回覆</button>
          </div>`
        : ''}
      ${editingComment
        ? html`<div id="edit-info">
            編輯中:
            <span id="edit-comment-id">${editingComment.id}</span>
            <button type="button" @click=${cancelEdit}>取消編輯</button>
          </div>`
        : ''}

      <button type="submit">${editingComment ? '更新留言' : '發送留言'}</button>
    </form>
    <div id="preview">
      ${previewText ? renderMarkdown(previewText) : html``}
    </div>
  `;
}

let commentMap: CommentMap = {};
let comments: Comment[] = [];
async function renderApp(): Promise<void> {
  // loading comments
  if (comments.length === 0) {
    comments = await loadComments();
    commentMap = {};
    comments.forEach((comment) => {
      commentMap[comment.id] = comment;
    });
  }

  const appTemplate = html`
    <div class="cf-container">
      ${createFormTemplate()}
      <div id="comments">
        ${until(
          Promise.resolve(comments).then((data) => processComments(data)),
          html`<div>載入中...</div>`,
        )}
      </div>
    </div>
  `;

  const appElement = document.getElementById('cf-app');
  if (appElement) {
    render(appTemplate, appElement);
  }
}

// Initial render
renderApp();
