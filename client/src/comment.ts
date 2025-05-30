import DOMPurify, { type Config as dompurifyConfig } from 'dompurify';
import snarkdown from 'snarkdown';
import { html, render, type TemplateResult } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import type { Comment } from '@cf-comment/shared';
import { createApiService } from './apiService';
import { createI18n } from './i18n';
import './comment.css';

type CommentMap = {
  [id: string]: Comment;
};

const POST = '/blog/my-post';
const API_URL = 'http://localhost:8787/';
const apiService = createApiService(API_URL);
const i18n = createI18n();

let currentReplyTo: string | null = null;
let previewText: string = '';
let editingComment: Comment | null = null;
let activeTab: 'write' | 'preview' = 'write';

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  // window.opener
  if (node.tagName === 'A') {
    node.setAttribute('rel', 'noopener noreferrer');
    node.setAttribute('target', '_blank');
  }

  // Add loading lazy attribute
  if (node.tagName === 'IMG') {
    node.setAttribute('loading', 'lazy');
  }
});

// Only http:// or https://
DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
  if (data.attrName === 'href' || data.attrName === 'src') {
    try {
      const url = new URL(data.attrValue || ''); // Disregard the relative path
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        data.keepAttr = false; // Remove the attribute entirely
      }
    } catch (_err) {
      data.keepAttr = false; // Remove the attribute entirely
    }
  }
});

const DompurifyConfig: dompurifyConfig = {
  ALLOWED_TAGS: [
    'a',
    'b',
    'i',
    'em',
    'strong',
    's',
    'p',
    'ul',
    'ol',
    'li',
    'code',
    'pre',
    'blockquote',
    'h6', // only H6
    'hr',
    'br',
    'img',
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt'],
  ALLOW_DATA_ATTR: false, // data-*
  ALLOW_ARIA_ATTR: false, // aria-*

  // explicitly blocklist
  FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'form', 'embed'],
  FORBID_ATTR: ['style', 'onclick', 'onmouseover', 'onload', 'onunload', 'onerror'],
};

function canEditComment(commentId: string): boolean {
  return apiService.canEditComment(commentId);
}

function renderMarkdown(md: string): ReturnType<typeof unsafeHTML> {
  return unsafeHTML(DOMPurify.sanitize(snarkdown(md || ''), DompurifyConfig));
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
  return comment?.name || i18n.t('anonymous');
}

function renderForm() {
  const formTemplate = createFormTemplate();
  const formElement = document.getElementById('comment-form-container');
  if (formElement) {
    render(formTemplate, formElement);
  }
}

function renderPreview() {
  const now = Date.now();
  const nameInput = document.querySelector('#comment-form input[name="name"]') as HTMLInputElement;
  const userName = nameInput ? nameInput.value : '';

  const previewTemplate = html`
    <div id="preview" class="${activeTab === 'preview' ? 'active' : ''}">
      ${previewText
        ? html`
            <div class="comment preview-comment">
              <div class="comment-header">
                <span class="comment-name">${userName || i18n.t('anonymous')}</span>
                <span class="comment-time">${formatDate(now)}</span>
                ${currentReplyTo && commentMap[currentReplyTo]
                  ? html`<span class="reply-to">
                      ${i18n.t('replyTo')}
                      <span>${getDisplayName(commentMap[currentReplyTo])}</span>
                    </span>`
                  : ''}
              </div>
              <div class="comment-content">${renderMarkdown(previewText)}</div>
            </div>
          `
        : html`<div class="empty-preview">${i18n.t('emptyPreview')}</div>`}
    </div>
  `;
  const previewElement = document.getElementById('preview-container');
  if (previewElement) {
    render(previewElement.classList.contains('active') ? previewTemplate : html``, previewElement);
  }
}

function switchTab(tab: 'write' | 'preview') {
  activeTab = tab;

  const writeTab = document.getElementById('write-tab');
  const previewTab = document.getElementById('preview-tab');
  const formContainer = document.getElementById('form-content');
  const previewContainer = document.getElementById('preview-container');

  if (writeTab && previewTab) {
    writeTab.classList.toggle('active', tab === 'write');
    previewTab.classList.toggle('active', tab === 'preview');
  }

  if (formContainer && previewContainer) {
    formContainer.classList.toggle('active', tab === 'write');
    previewContainer.classList.toggle('active', tab === 'preview');

    if (tab === 'preview') {
      renderPreview();
    }
  }
}

async function renderCommentsList() {
  if (comments.length === 0) {
    comments = await loadComments();
    commentMap = {};
    comments.forEach((comment) => {
      commentMap[comment.id] = comment;
    });
  }

  const commentsTemplate = html` <div id="comments">${processComments(comments)}</div> `;

  const commentsElement = document.getElementById('comments-container');
  if (commentsElement) {
    render(commentsTemplate, commentsElement);
  }
}

function setReplyTo(commentId: string): void {
  currentReplyTo = commentId;
  renderForm();

  const form = document.querySelector('#comment-form-container');
  if (form) {
    form.scrollIntoView({ behavior: 'smooth' });
  }
}

function cancelReply(): void {
  currentReplyTo = null;
  renderForm();
}

function handleInputChange(e: Event): void {
  const target = e.target as HTMLInputElement;
  previewText = target.value;

  if (activeTab === 'preview') {
    renderPreview();
  }
}

async function loadComments(): Promise<Comment[]> {
  return await apiService.getComments(POST);
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
        <span class="${nameClass}" title="${comment.id}">${getDisplayName(comment)}</span>
        <span class="${timeClass}">${formatDate(comment.pubDate)}</span>
        ${replyToName
          ? html`<span class="reply-to"
              >${i18n.t('replyTo')}
              <span title="${comment.replyTo ?? ''}">${replyToName}</span></span
            >`
          : ''}
        ${canEdit
          ? html`<span class="comment-controls">
              <button class="edit-button" @click=${() => handleEdit(comment)}>
                ${i18n.t('edit')}
              </button>
              <button class="delete-button" @click=${() => handleDelete(comment.id)}>
                ${i18n.t('delete')}
              </button>
            </span>`
          : ''}
      </div>
      <div class="${contentClass}">${renderMarkdown(comment.msg)}</div>
      <button class="reply-button" @click=${() => setReplyTo(comment.id)}>
        ${i18n.t('reply')}
      </button>
      ${isRoot && allReplies
        ? html`<div class="replies">
            ${allReplies.map((reply) => {
              const replyToComment =
                reply.replyTo && commentMap ? commentMap[reply.replyTo] : undefined;
              const replyToName = replyToComment ? getDisplayName(replyToComment) : '';
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
  return createCommentItemTemplate(rootComment, true, null, allReplies, commentMap);
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
  const name = formData.get('name') as string;
  const message = formData.get('message') as string;

  let success = false;

  if (editingComment) {
    success = await apiService.updateComment(POST, editingComment.id, name, message);

    if (success) {
      (e.target as HTMLFormElement).reset();
      previewText = '';
      editingComment = null;
      renderForm();
      renderPreview();
    } else {
      alert(i18n.t('editFailed'));
    }
  } else {
    success = await apiService.addComment(POST, name, message, currentReplyTo);

    if (success) {
      (e.target as HTMLFormElement).reset();
      previewText = '';
      currentReplyTo = null;
      renderForm();
      renderPreview();
    } else {
      alert(i18n.t('submitFailed'));
    }
  }

  if (success) {
    comments.length = 0;
    await renderCommentsList();
  }
}

async function handleDelete(commentId: string): Promise<void> {
  if (!confirm(i18n.t('confirmDelete'))) return;

  const success = await apiService.deleteComment(POST, commentId);

  if (success) {
    comments.length = 0;
    await renderCommentsList();
  } else {
    alert(i18n.t('deleteFailed'));
  }
}

function handleEdit(comment: Comment): void {
  editingComment = comment;
  const nameInput = document.querySelector('#comment-form input[name="name"]') as HTMLInputElement;
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

  renderForm();
  renderPreview();

  const form = document.querySelector('#comment-form-container');
  if (form) {
    form.scrollIntoView({ behavior: 'smooth' });
  }
}

function cancelEdit(): void {
  editingComment = null;
  const form = document.querySelector('#comment-form') as HTMLFormElement;
  if (form) {
    form.reset();
  }
  previewText = '';
  renderForm();
  renderPreview();
}

function createFormTemplate() {
  return html`
    <div class="comment-tabs">
      <button
        id="write-tab"
        class="tab ${activeTab === 'write' ? 'active' : ''}"
        @click=${() => switchTab('write')}
      >
        ${i18n.t('write')}
      </button>
      <button
        id="preview-tab"
        class="tab ${activeTab === 'preview' ? 'active' : ''}"
        @click=${() => switchTab('preview')}
      >
        ${i18n.t('preview')}
      </button>
    </div>
    <div class="tab-content">
      <div id="form-content" class="${activeTab === 'write' ? 'active' : ''}">
        <form id="comment-form" @submit=${handleSubmit}>
          <input type="text" name="name" placeholder="${i18n.t('namePlaceholder')}" />
          <textarea
            name="message"
            placeholder="${i18n.t('messagePlaceholder')}"
            required
            @input=${handleInputChange}
          ></textarea>

          <div class="form-actions">
            ${currentReplyTo && commentMap[currentReplyTo]
              ? html`<div id="reply-info">
                  ${i18n.t('replyingTo')}
                  <span id="reply-to-name">${getDisplayName(commentMap[currentReplyTo])}</span>
                  <button type="button" @click=${cancelReply}>${i18n.t('cancelReply')}</button>
                </div>`
              : ''}
            ${editingComment
              ? html`<div id="edit-info">
                  ${i18n.t('editing')}
                  <span id="edit-comment-id">${editingComment.id}</span>
                  <button type="button" @click=${cancelEdit}>${i18n.t('cancelEdit')}</button>
                </div>`
              : ''}

            <button type="submit" class="submit-button">
              ${editingComment ? i18n.t('updateComment') : i18n.t('submitComment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

let commentMap: CommentMap = {};
let comments: Comment[] = [];

// Init DOM structure and render the app
async function renderApp(): Promise<void> {
  const appTemplate = html`
    <div class="cf-container">
      <div id="comment-form-container"></div>
      <div id="preview-container"></div>
      <div id="comments-container"></div>
    </div>
  `;

  const appElement = document.getElementById('cf-app');
  if (appElement) {
    render(appTemplate, appElement);

    renderForm();
    renderPreview();
    await renderCommentsList();
  }
}

// Initial render
renderApp();
