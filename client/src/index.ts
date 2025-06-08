import DOMPurify, { type Config as dompurifyConfig } from 'dompurify';
import snarkdown from 'snarkdown';
import { html, render, type TemplateResult } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import type { Comment } from '@wonton-comment/shared';
import { createApiService } from './apiService';
import { createI18n, en, zhHant, type I18nStrings } from './i18n';
import { generatePseudonymAndHash } from './utils/pseudonym';
import './index.css';

type CommentMap = {
  [id: string]: Comment;
};

type TabType = 'write' | 'preview';

export function initWontonComment(
  elementId: string = 'wtc-app',
  options: {
    post?: string;
    apiUrl?: string;
    language?: 'en' | 'zh-Hant' | I18nStrings;
  } = {},
) {
  const wontonApp = new WontonComment(elementId, options);
  wontonApp.renderApp();
  return wontonApp;
}

class WontonComment {
  private static readonly MAX_NAME_LENGTH = 25;
  private static readonly MAX_MESSAGE_LENGTH = 1000;
  private static readonly MY_NAME_HASHES_KEY = 'wtc_my_name_hashes';

  private elementId: string;
  private post: string;
  private apiUrl: string;
  private apiService: ReturnType<typeof createApiService>;
  private i18n: ReturnType<typeof createI18n>;
  private commentMap: CommentMap = {};
  private comments: Comment[] = [];
  private currentReplyTo: string | null = null;
  private previewText: string = '';
  private previewName: string = '';
  private previewPseudonym: string = '';
  private editingComment: Comment | null = null;
  private activeTab: TabType = 'write';
  private showMarkdownHelp: boolean = false;
  private showAdminLogin: boolean = false;

  constructor(
    elementId: string,
    options: {
      post?: string;
      apiUrl?: string;
      language?: 'en' | 'zh-Hant' | I18nStrings;
    } = {},
  ) {
    this.elementId = elementId;
    this.post = options.post || '/blog/my-post';
    this.apiUrl = options.apiUrl || 'http://localhost:8787/';
    this.apiService = createApiService(this.apiUrl);

    let languageStrings: I18nStrings = en;
    if (options.language) {
      if (typeof options.language === 'string') {
        languageStrings = options.language === 'zh-Hant' ? zhHant : en;
      } else {
        languageStrings = options.language;
      }
    }
    this.i18n = createI18n(languageStrings);

    this.setupDOMPurify();
  }

  private setupDOMPurify() {
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
  }

  private DompurifyConfig: dompurifyConfig = {
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
    // FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'form', 'embed'],
    // FORBID_ATTR: ['style', 'onclick', 'onmouseover', 'onload', 'onunload', 'onerror'],
  };

  private renderMarkdown(md: string): ReturnType<typeof unsafeHTML> {
    return unsafeHTML(DOMPurify.sanitize(snarkdown(md || ''), this.DompurifyConfig));
  }

  private formatDate(timestamp: number): string {
    const date = new Date(timestamp);

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');

    let hour = date.getHours();
    const minute = String(date.getMinutes()).padStart(2, '0');
    const period = hour >= 12 ? 'PM' : 'AM';

    hour = hour % 12;
    if (hour === 0) hour = 12; // Convert 0 to 12 for 12-hour format
    const h = String(hour).padStart(2, '0');

    return `${y}/${m}/${d} ${h}:${minute} ${period}`;
  }

  private getDisplayName(comment: Comment | undefined): string {
    const cleanedName = comment?.pseudonym
      ? DOMPurify.sanitize(comment.pseudonym, { ALLOWED_TAGS: [] }) // Remove all HTML tags
      : undefined;

    return cleanedName ? cleanedName : this.i18n.t('anonymous');
  }

  private canEditComment(commentId: string): boolean {
    return this.apiService.canEditComment(commentId);
  }

  private saveMyNameHash(nameHash: string): void {
    try {
      const existingHashes = this.getMyNameHashes();
      if (nameHash && !existingHashes.includes(nameHash)) {
        existingHashes.push(nameHash);
        localStorage.setItem(WontonComment.MY_NAME_HASHES_KEY, JSON.stringify(existingHashes));
      }
    } catch (error) {
      console.warn('Failed to save name hash to localStorage:', error);
    }
  }

  private getMyNameHashes(): string[] {
    try {
      const stored = localStorage.getItem(WontonComment.MY_NAME_HASHES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to get name hashes from localStorage:', error);
      return [];
    }
  }

  private isMyComment(comment: Comment): boolean {
    if (!comment.nameHash) return false;
    return this.getMyNameHashes().includes(comment.nameHash);
  }

  private async loadComments(): Promise<Comment[]> {
    return await this.apiService.getComments(this.post);
  }

  private renderForm(): void {
    const formTemplate = this.createFormTemplate();
    const formElement = document.getElementById('comment-form-container');
    if (formElement) {
      render(formTemplate, formElement);
      this.restoreFormInputs();
    }
  }

  private restoreFormInputs(): void {
    if (this.previewName) {
      const nameInput = document.querySelector(
        '#comment-form input[name="name"]',
      ) as HTMLInputElement;
      if (nameInput) {
        nameInput.value = this.previewName;
        // Update character count for name
        this.updateCharCount('name', this.previewName.length);

        // Update over-limit styling
        const nameCountEl = document.getElementById('name-char-count');
        if (nameCountEl) {
          if (this.previewName.length > WontonComment.MAX_NAME_LENGTH) {
            nameCountEl.classList.add('over-limit');
          } else {
            nameCountEl.classList.remove('over-limit');
          }
        }
      }
    }

    if (this.previewText) {
      const messageInput = document.querySelector(
        '#comment-form textarea[name="message"]',
      ) as HTMLTextAreaElement;
      if (messageInput) {
        messageInput.value = this.previewText;
        // Update character count for message
        this.updateCharCount('message', this.previewText.length);

        // Update over-limit styling
        const messageCountEl = document.getElementById('message-char-count');
        if (messageCountEl) {
          if (this.previewText.length > WontonComment.MAX_MESSAGE_LENGTH) {
            messageCountEl.classList.add('over-limit');
          } else {
            messageCountEl.classList.remove('over-limit');
          }
        }
      }
    }
  }

  private createPreviewTemplate(): TemplateResult<1> {
    const now = Date.now();
    const userName = this.previewPseudonym;

    return html`
      <div class="comment-box preview-mode">
        <div id="preview">
          ${this.previewText
            ? html`
                <div class="preview-comment">
                  <div class="comment-header">
                    <span class="comment-name">${userName || this.i18n.t('anonymous')}</span>
                    <span class="comment-time">${this.formatDate(now)}</span>
                    ${this.currentReplyTo && this.commentMap[this.currentReplyTo]
                      ? html`<span class="reply-to">
                          ${this.i18n.t('replyTo')}
                          <span>${this.getDisplayName(this.commentMap[this.currentReplyTo])}</span>
                        </span>`
                      : ''}
                  </div>
                  <div class="comment-content">${this.renderMarkdown(this.previewText)}</div>
                </div>
              `
            : html`<div class="empty-preview">${this.i18n.t('emptyPreview')}</div>`}
        </div>
        <div class="comment-footer wtc-flex wtc-gap-xs">
          <span style="flex: 1;"></span>
          <div class="wtc-flex wtc-gap-xs">
            <button
              type="button"
              class="help-btn wtc-clickable wtc-reset-button"
              title="${this.i18n.t('markdownHelp')}"
              @click=${() => this.toggleMarkdownHelp()}
            >
              ?
            </button>
            <button
              type="button"
              class="preview-btn wtc-clickable wtc-transition wtc-transparent-bg active wtc-reset-button"
              @click=${() => this.switchTab('write')}
            >
              ${this.i18n.t('write')}
            </button>
            <button
              type="button"
              class="submit-btn wtc-clickable wtc-transition wtc-reset-button"
              @click=${() => this.handlePreviewSubmit()}
            >
              ${this.editingComment ? this.i18n.t('updateComment') : this.i18n.t('submitComment')}
            </button>
          </div>
        </div>
      </div>

      <div id="markdown-help-modal"></div>
    `;
  }

  // Render preview template to DOM or fallback to form
  private renderPreview(): void {
    if (this.activeTab === 'preview') {
      const previewTemplate = this.createPreviewTemplate();
      const formElement = document.getElementById('comment-form-container');
      if (formElement) {
        render(previewTemplate, formElement);
      }
    } else {
      this.renderForm();
    }
  }

  private switchTab(tab: 'write' | 'preview'): void {
    this.activeTab = tab;

    if (tab === 'preview') {
      this.saveCurrentFormInputs();
      this.renderPreview();
    } else {
      this.renderForm();
    }
  }

  // Save current form input values to state
  private saveCurrentFormInputs(): void {
    const nameInput = document.querySelector(
      '#comment-form input[name="name"]',
    ) as HTMLInputElement;
    if (nameInput) {
      this.previewName = nameInput.value;
    }
  }

  // Render comments list with error handling
  private async renderCommentsList(): Promise<void> {
    if (this.comments.length === 0) {
      this.comments = await this.loadComments();
      this.buildCommentMap();
    }

    const commentsTemplate = this.createCommentsTemplate();
    const commentsElement = document.getElementById('comments-container');
    if (commentsElement) {
      render(commentsTemplate, commentsElement);
    }
  }

  // Build comment map for quick lookup
  private buildCommentMap(): void {
    this.commentMap = {};
    this.comments.forEach((comment) => {
      this.commentMap[comment.id] = comment;
    });
  }

  // Create template for comments container
  private createCommentsTemplate(): TemplateResult<1> {
    return html` <div id="comments">${this.processComments(this.comments)}</div> `;
  }

  private setReplyTo(commentId: string): void {
    // Clear editing state if currently editing
    if (this.editingComment) {
      this.editingComment = null;
      this.previewText = '';
      this.previewName = '';
      this.previewPseudonym = '';
    }

    this.currentReplyTo = commentId;
    this.renderForm();

    const form = document.querySelector('#comment-form-container');
    if (form) {
      form.scrollIntoView({ behavior: 'smooth' });
    }
  }

  private cancelReply(): void {
    this.currentReplyTo = null;
    this.renderForm();
  }
  private handleInputChange(e: Event): void {
    const target = e.target as HTMLTextAreaElement;
    this.previewText = target.value;

    // Update character count
    this.updateCharCount('message', target.value.length);

    // Validate length
    const messageCountEl = document.getElementById('message-char-count');
    if (messageCountEl) {
      if (target.value.length > WontonComment.MAX_MESSAGE_LENGTH) {
        messageCountEl.classList.add('over-limit');
      } else {
        messageCountEl.classList.remove('over-limit');
      }
    }

    if (this.activeTab === 'preview') {
      this.renderPreview();
    }
  }
  private async handleNameInputChange(e: Event): Promise<void> {
    const target = e.target as HTMLInputElement;
    this.previewName = target.value;

    // Generate pseudonym for preview
    if (target.value.trim()) {
      try {
        const { pseudonym } = await generatePseudonymAndHash(target.value);
        this.previewPseudonym = pseudonym;
      } catch (error) {
        console.warn('Failed to generate pseudonym:', error);
        this.previewPseudonym = '';
      }
    } else {
      this.previewPseudonym = '';
    }

    // Update character count
    this.updateCharCount('name', target.value.length); // Validate length
    const nameCountEl = document.getElementById('name-char-count');
    if (nameCountEl) {
      if (target.value.length > WontonComment.MAX_NAME_LENGTH) {
        nameCountEl.classList.add('over-limit');
      } else {
        nameCountEl.classList.remove('over-limit');
      }
    }

    // Update preview if in preview mode
    if (this.activeTab === 'preview') {
      this.renderPreview();
    }
  }

  private updateCharCount(type: 'name' | 'message', count: number): void {
    const countElement = document.getElementById(`${type}-char-count`);
    if (countElement) {
      countElement.textContent = count.toString();
    }
  }

  // Create comment item template with proper type annotation
  private createCommentItemTemplate(
    comment: Comment,
    isRoot: boolean = false,
    replyToName: string | null = null,
    allReplies: Comment[] | null = null,
    commentMap: CommentMap | null = null,
  ): TemplateResult<1> {
    const cssClasses = this.getCommentCssClasses(isRoot);
    const canEdit = this.canEditComment(comment.id);

    return html`
      <div class="${cssClasses.item}" ${isRoot ? `data-id="${comment.id}"` : ''}>
        ${this.createCommentHeader(comment, cssClasses, replyToName, canEdit)}
        ${this.createCommentContent(comment, cssClasses.content)}
        ${this.createCommentActions(comment)}
        ${this.createRepliesSection(isRoot, allReplies, commentMap)}
      </div>
    `;
  }

  // Get CSS classes for comment components
  private getCommentCssClasses(isRoot: boolean) {
    const prefix = isRoot ? 'comment' : 'reply';
    return {
      item: prefix,
      header: `${prefix}-header wtc-flex wtc-flex-wrap`,
      name: `${prefix}-name`,
      time: `${prefix}-time`,
      content: `${prefix}-content`,
    };
  }
  // Create comment header template
  private createCommentHeader(
    comment: Comment,
    cssClasses: ReturnType<typeof this.getCommentCssClasses>,
    replyToName: string | null,
    canEdit: boolean,
  ): TemplateResult<1> {
    const isMyComment = this.isMyComment(comment);

    return html`
      <div class="${cssClasses.header}">
        <span class="${cssClasses.name}" title="${comment.id}">
          ${this.getDisplayName(comment)}
          ${isMyComment ? html`<span class="my-comment-badge">Me</span>` : ''}
        </span>
        <span
          class="${cssClasses.time}"
          title="${comment.modDate ? this.formatDate(comment.pubDate) : undefined}"
        >
          ${comment.modDate
            ? this.i18n.t('modified') + ' ' + this.formatDate(comment.modDate)
            : this.formatDate(comment.pubDate)}
        </span>
        ${this.createReplyToIndicator(replyToName, comment.replyTo)}
        ${this.createCommentControls(canEdit, comment)}
      </div>
    `;
  }

  // Create reply-to indicator template
  private createReplyToIndicator(
    replyToName: string | null,
    replyToId?: string,
  ): TemplateResult<1> | string {
    return replyToName
      ? html`<span class="reply-to">
          ${this.i18n.t('replyTo')}
          <span title="${replyToId ?? ''}">${replyToName}</span>
        </span>`
      : '';
  }

  // Create comment control buttons template
  private createCommentControls(canEdit: boolean, comment: Comment): TemplateResult<1> | string {
    return canEdit
      ? html`<span class="comment-controls wtc-flex wtc-gap-xs">
          <button
            class="edit-button wtc-clickable wtc-transition wtc-transparent-bg wtc-reset-button"
            @click=${() => this.handleEdit(comment)}
          >
            ${this.i18n.t('edit')}
          </button>
          <button
            class="delete-button wtc-clickable wtc-transition wtc-transparent-bg wtc-reset-button"
            @click=${() => this.handleDelete(comment.id)}
          >
            ${this.i18n.t('delete')}
          </button>
        </span>`
      : '';
  }

  // Create comment content template
  private createCommentContent(comment: Comment, contentClass: string): TemplateResult<1> {
    return html`<div class="${contentClass}">${this.renderMarkdown(comment.msg)}</div>`;
  }

  // Create comment actions template
  private createCommentActions(comment: Comment): TemplateResult<1> {
    return html`
      <button
        class="reply-button wtc-clickable wtc-transition wtc-transparent-bg wtc-reset-button"
        @click=${() => this.setReplyTo(comment.id)}
      >
        ${this.i18n.t('reply')}
      </button>
    `;
  }

  // Create replies section template
  private createRepliesSection(
    isRoot: boolean,
    allReplies: Comment[] | null,
    commentMap: CommentMap | null,
  ): TemplateResult<1> | string {
    if (!isRoot) return '';

    return html`<div class="replies">
      ${allReplies
        ? allReplies.map((reply) => {
            const replyToComment =
              reply.replyTo && commentMap ? commentMap[reply.replyTo] : undefined;
            const replyToName = replyToComment ? this.getDisplayName(replyToComment) : '';
            return this.createCommentItemTemplate(reply, false, replyToName);
          })
        : ''}
    </div>`;
  }

  private createCommentTemplate(
    rootComment: Comment,
    allReplies: Comment[],
    commentMap: CommentMap,
  ) {
    return this.createCommentItemTemplate(rootComment, true, null, allReplies, commentMap);
  }

  private processComments(data: Comment[]) {
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

    const getAllReplies = (commentId: string): Comment[] => {
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
    };

    return rootComments.map((rootComment) => {
      const allReplies = getAllReplies(rootComment.id);
      return this.createCommentTemplate(rootComment, allReplies, this.commentMap);
    });
  }

  // Handle form submission and state cleanup
  private async handleSubmit(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const originalName = formData.get('name') as string;
    const message = formData.get('message') as string;

    // Validate lengths for original name
    if (originalName && originalName.length > WontonComment.MAX_NAME_LENGTH) {
      alert(
        `${this.i18n.t('nameTooLong')} (${originalName.length}/${WontonComment.MAX_NAME_LENGTH})`,
      );
      return;
    }

    if (message.length > WontonComment.MAX_MESSAGE_LENGTH) {
      alert(
        `${this.i18n.t('messageTooLong')} (${message.length}/${WontonComment.MAX_MESSAGE_LENGTH})`,
      );
      return;
    }

    // Generate pseudonym and hash from original name
    const { pseudonym, hash } = await generatePseudonymAndHash(originalName);

    const success = await this.processSubmission(pseudonym, hash, message);

    if (success) {
      this.resetFormState();
      this.comments.length = 0;
      await this.renderCommentsList();
    }
  }

  // Process comment submission
  private async processSubmission(
    pseudonym: string,
    nameHash: string,
    message: string,
  ): Promise<boolean> {
    if (this.editingComment) {
      const success = await this.apiService.updateComment(
        this.post,
        this.editingComment.id,
        pseudonym,
        nameHash,
        message,
      );

      if (!success) {
        alert(this.i18n.t('editFailed'));
      }

      return success;
    } else {
      const commentId = await this.apiService.addComment(
        this.post,
        pseudonym,
        nameHash,
        message,
        this.currentReplyTo,
      );
      if (!commentId) {
        alert(this.i18n.t('submitFailed'));
        return false;
      }

      this.saveMyNameHash(nameHash);
      return true;
    }
  }
  // Reset form state after successful submission
  private resetFormState(): void {
    const form = document.querySelector('#comment-form') as HTMLFormElement;
    if (form) {
      form.reset();
    }
    this.previewText = '';
    this.previewName = '';
    this.previewPseudonym = '';
    this.editingComment = null;
    this.currentReplyTo = null;

    // Reset character counts
    this.updateCharCount('message', 0);
    this.updateCharCount('name', 0);

    // Remove over-limit styling
    const nameCountEl = document.getElementById('name-char-count');
    const messageCountEl = document.getElementById('message-char-count');
    if (nameCountEl) {
      nameCountEl.classList.remove('over-limit');
    }
    if (messageCountEl) {
      messageCountEl.classList.remove('over-limit');
    }

    this.renderForm();
    this.renderPreview();
  } // Handle preview mode submission
  private async handlePreviewSubmit(): Promise<void> {
    // Validate lengths
    if (this.previewName && this.previewName.length > WontonComment.MAX_NAME_LENGTH) {
      alert(
        `${this.i18n.t('nameTooLong')} (${this.previewName.length}/${
          WontonComment.MAX_NAME_LENGTH
        })`,
      );
      return;
    }

    if (this.previewText.length > WontonComment.MAX_MESSAGE_LENGTH) {
      alert(
        `${this.i18n.t('messageTooLong')} (${this.previewText.length}/${
          WontonComment.MAX_MESSAGE_LENGTH
        })`,
      );
      return;
    }

    // Generate pseudonym and hash from original name
    const { pseudonym, hash } = await generatePseudonymAndHash(this.previewName);

    const success = await this.processSubmission(pseudonym, hash, this.previewText);

    if (success) {
      this.resetPreviewState();
      this.comments.length = 0;
      await this.renderCommentsList();
    }
  }
  // Reset preview state after successful submission
  private resetPreviewState(): void {
    this.previewText = '';
    this.previewName = '';
    this.previewPseudonym = '';
    this.editingComment = null;
    this.currentReplyTo = null;
    this.switchTab('write');
    const form = document.querySelector('#comment-form') as HTMLFormElement;
    if (form) {
      form.reset();
    }

    // Reset character counts
    this.updateCharCount('message', 0);
    this.updateCharCount('name', 0);

    // Remove over-limit styling
    const nameCountEl = document.getElementById('name-char-count');
    const messageCountEl = document.getElementById('message-char-count');
    if (nameCountEl) {
      nameCountEl.classList.remove('over-limit');
    }
    if (messageCountEl) {
      messageCountEl.classList.remove('over-limit');
    }
  }

  private async handleDelete(commentId: string): Promise<void> {
    if (!confirm(this.i18n.t('confirmDelete'))) return;

    const success = await this.apiService.deleteComment(this.post, commentId);

    if (success) {
      this.comments.length = 0;
      await this.renderCommentsList();
    } else {
      alert(this.i18n.t('deleteFailed'));
    }
  }

  // Handle edit comment action
  private handleEdit(comment: Comment): void {
    this.clearReplyState();
    this.setEditingState(comment);
    this.populateFormWithComment(comment);
    this.scrollToForm();
  }

  // Clear reply state when editing
  private clearReplyState(): void {
    if (this.currentReplyTo) {
      this.currentReplyTo = null;
    }
  }

  // Set editing state for a comment
  private setEditingState(comment: Comment): void {
    this.editingComment = comment;
    this.previewText = comment.msg || '';
    this.previewName = comment.pseudonym || '';
    this.previewPseudonym = comment.pseudonym || '';
  }

  // Populate form inputs with comment data
  private populateFormWithComment(comment: Comment): void {
    const nameInput = document.querySelector(
      '#comment-form input[name="name"]',
    ) as HTMLInputElement;
    const messageInput = document.querySelector(
      '#comment-form textarea[name="message"]',
    ) as HTMLTextAreaElement;
    if (nameInput) {
      nameInput.value = comment.pseudonym || '';
      this.previewName = comment.pseudonym || '';
      this.previewPseudonym = comment.pseudonym || '';
      // Update character count for name
      this.updateCharCount('name', (comment.pseudonym || '').length);

      // Update over-limit styling
      const nameCountEl = document.getElementById('name-char-count');
      if (nameCountEl) {
        if ((comment.pseudonym || '').length > WontonComment.MAX_NAME_LENGTH) {
          nameCountEl.classList.add('over-limit');
        } else {
          nameCountEl.classList.remove('over-limit');
        }
      }
    }

    if (messageInput) {
      messageInput.value = comment.msg || '';
      this.previewText = comment.msg || '';
      // Update character count for message
      this.updateCharCount('message', (comment.msg || '').length);

      // Update over-limit styling
      const messageCountEl = document.getElementById('message-char-count');
      if (messageCountEl) {
        if ((comment.msg || '').length > WontonComment.MAX_MESSAGE_LENGTH) {
          messageCountEl.classList.add('over-limit');
        } else {
          messageCountEl.classList.remove('over-limit');
        }
      }
    }

    this.renderForm();
    this.renderPreview();
  }

  // Scroll to form container
  private scrollToForm(): void {
    const form = document.querySelector('#comment-form-container');
    if (form) {
      form.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // Cancel editing mode and reset state
  private cancelEdit(): void {
    this.editingComment = null;
    this.clearFormAndPreview();
    this.renderForm();
    this.renderPreview();
  }
  // Clear form data and preview state
  private clearFormAndPreview(): void {
    const form = document.querySelector('#comment-form') as HTMLFormElement;
    if (form) {
      form.reset();
    }
    this.previewText = '';
    this.previewName = '';
    this.previewPseudonym = '';

    // Reset character counts
    this.updateCharCount('message', 0);
    this.updateCharCount('name', 0);

    // Remove over-limit styling
    const nameCountEl = document.getElementById('name-char-count');
    const messageCountEl = document.getElementById('message-char-count');
    if (nameCountEl) {
      nameCountEl.classList.remove('over-limit');
    }
    if (messageCountEl) {
      messageCountEl.classList.remove('over-limit');
    }
  }

  // Toggle markdown help modal visibility
  private toggleMarkdownHelp(): void {
    this.showMarkdownHelp = !this.showMarkdownHelp;
    this.renderMarkdownHelp();
  }

  // Render or hide markdown help modal
  private renderMarkdownHelp(): void {
    const helpElement = document.getElementById('markdown-help-modal');
    if (!helpElement) return;

    if (this.showMarkdownHelp) {
      this.showHelpModal(helpElement);
    } else {
      this.hideHelpModal(helpElement);
    }
  }

  // Show help modal with content
  private showHelpModal(helpElement: HTMLElement): void {
    render(this.createMarkdownHelpTemplate(), helpElement);
    helpElement.classList.add('active');
  }

  // Hide help modal
  private hideHelpModal(helpElement: HTMLElement): void {
    render(html``, helpElement);
    helpElement.classList.remove('active');
  }

  private createMarkdownHelpTemplate() {
    return html`
      <div class="markdown-help-container wtc-flex">
        <div
          class="markdown-help-backdrop wtc-clickable"
          @click=${() => this.toggleMarkdownHelp()}
        ></div>
        <div class="markdown-help-content">
          <button
            class="markdown-help-close wtc-clickable wtc-reset-button"
            @click=${() => this.toggleMarkdownHelp()}
          >
            ×
          </button>
          <h4>${this.i18n.t('commentSystemTitle')}</h4>
          <p>${this.i18n.t('commentSystemDesc')}</p>
          <p>${this.i18n.t('commentTimeLimit')}</p>
          <p>
            Powered by&nbsp;<a
              href="https://github.com/ziteh/wonton-comment"
              target="_blank"
              rel="noopener noreferrer"
              >Wonton</a
            >
          </p>
          <h4>${this.i18n.t('markdownSyntax')}</h4>
          <p>${this.i18n.t('markdownBasicSupport')}</p>
          <div class="markdown-examples">
            <code>
              <pre>
${this.i18n.t('markdownLinkExample')}

${this.i18n.t('markdownImageExample')}

${this.i18n.t('markdownItalicExample')}

${this.i18n.t('markdownBoldExample')}

${this.i18n.t('markdownListExample')}

${this.i18n.t('markdownOrderedListExample')}

${this.i18n.t('markdownInlineCodeExample')}

${this.i18n.t('markdownCodeBlockExample')}</pre
              >
            </code>
          </div>
        </div>
      </div>
    `;
  }

  private createFormTemplate(): TemplateResult<1> {
    return html`
      ${this.createFormContent()} ${this.createStatusIndicators()}
      <div id="markdown-help-modal"></div>
      <div id="admin-login-modal"></div>
    `;
  }

  private createFormContent(): TemplateResult<1> {
    return html`
      <div class="comment-box">
        <div id="form-content" class="${this.activeTab === 'write' ? 'active' : ''}">
          <form
            id="comment-form"
            class="wtc-reset-form"
            @submit=${(e: SubmitEvent) => this.handleSubmit(e)}
          >
            <div class="honeypot-field">
              <input
                type="text"
                name="website"
                tabindex="-1"
                autocomplete="off"
                aria-hidden="true"
              />
            </div>
            ${this.createTextareaSection()} ${this.createFormFooter()}
          </form>
        </div>
      </div>
    `;
  }
  // Create textarea input section
  private createTextareaSection(): TemplateResult<1> {
    return html`
      <div class="comment-input">
        <textarea
          name="message"
          placeholder="${this.i18n.t('messagePlaceholder')}"
          maxlength="${WontonComment.MAX_MESSAGE_LENGTH}"
          required
          @input=${(e: Event) => this.handleInputChange(e)}
        ></textarea>
        <div class="char-count">
          <span id="message-char-count">0</span>/${WontonComment.MAX_MESSAGE_LENGTH}
        </div>
      </div>
    `;
  }

  private createFormFooter(): TemplateResult<1> {
    return html`
      <div class="comment-footer wtc-flex wtc-flex-wrap wtc-gap-xs">
        <div class="name-input-container">
          <input
            type="text"
            name="name"
            autocomplete="name"
            placeholder="${this.i18n.t('namePlaceholder')}"
            maxlength="${WontonComment.MAX_NAME_LENGTH}"
            @input=${(e: Event) => this.handleNameInputChange(e)}
          />
          <div class="pseudonym-notice" style="font-size: 0.8em; color: #666; margin-top: 4px;">
            ${this.i18n.t('pseudonymNotice')}
          </div>
        </div>
        <div class="wtc-flex wtc-gap-xs">${this.createFormButtons()}</div>
      </div>
    `;
  }

  // Create form action buttons
  private createFormButtons(): TemplateResult<1> {
    return html`
      <button
        type="button"
        class="help-btn wtc-clickable wtc-reset-button"
        title="${this.i18n.t('markdownHelp')}"
        @click=${() => this.toggleMarkdownHelp()}
      >
        ?
      </button>
      <button
        type="button"
        class="preview-btn wtc-clickable wtc-transition wtc-transparent-bg wtc-reset-button ${this
          .activeTab === 'preview'
          ? 'active'
          : ''}"
        @click=${() => this.switchTab(this.activeTab === 'preview' ? 'write' : 'preview')}
      >
        ${this.activeTab === 'preview' ? this.i18n.t('write') : this.i18n.t('preview')}
      </button>
      <button type="submit" class="submit-btn wtc-clickable wtc-transition wtc-reset-button">
        ${this.editingComment ? this.i18n.t('updateComment') : this.i18n.t('submitComment')}
      </button>
    `;
  }

  // Create admin button
  // TODO adjust position
  private createAdminButton(): TemplateResult<1> {
    return html`
      <button
        type="button"
        class="admin-btn wtc-clickable wtc-reset-button"
        title="Admin"
        @click=${() => this.showAdminModal()}
      >
        ⚙
      </button>
    `;
  }

  // Show admin login modal
  private showAdminModal(): void {
    this.showAdminLogin = true;
    this.renderAdminLogin();
  }

  // Hide admin login modal
  private hideAdminModal(): void {
    this.showAdminLogin = false;
    this.renderAdminLogin();
  }

  // Render admin login modal
  private renderAdminLogin(): void {
    const adminTemplate = this.showAdminLogin ? this.createAdminLoginTemplate() : html``;
    const modalElement = document.getElementById('admin-login-modal');
    if (modalElement) {
      render(adminTemplate, modalElement);
    }
  }

  // Create admin login modal template
  private createAdminLoginTemplate(): TemplateResult<1> {
    return html`
      <div class="admin-modal-backdrop wtc-clickable" @click=${() => this.hideAdminModal()}>
        <div class="admin-modal-content" @click=${(e: Event) => e.stopPropagation()}>
          <button
            class="admin-modal-close wtc-clickable wtc-reset-button"
            @click=${() => this.hideAdminModal()}
          >
            ×
          </button>
          <h3>Admin Login</h3>
          <form @submit=${(e: SubmitEvent) => this.handleAdminLogin(e)}>
            <div class="admin-form-group">
              <label for="admin-username">Username:</label>
              <input type="text" id="admin-username" name="username" required autocomplete="off" />
            </div>
            <div class="admin-form-group">
              <label for="admin-password">Password:</label>
              <input
                type="password"
                id="admin-password"
                name="password"
                required
                autocomplete="off"
              />
            </div>
            <button type="submit" class="admin-login-btn wtc-clickable wtc-reset-button">
              Login
            </button>
          </form>
        </div>
      </div>
    `;
  }

  // Handle admin login form submission
  private async handleAdminLogin(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    try {
      const response = await fetch(`${this.apiUrl}admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      if (response.ok) {
        const result = await response.text();
        // Store admin token or handle successful login
        console.log('Admin login result:', result);
        alert('Admin login successful!');
        this.hideAdminModal();
      } else {
        alert('Admin login failed!');
      }
    } catch (error) {
      console.error('Admin login error:', error);
      alert('Admin login error!');
    }
  }
  // Create status indicators (reply/edit info)
  private createStatusIndicators(): TemplateResult<1> | string {
    const replyIndicator = this.createReplyIndicator();
    const editIndicator = this.createEditIndicator();

    return replyIndicator || editIndicator ? html`${replyIndicator}${editIndicator}` : '';
  }

  // Create reply status indicator
  private createReplyIndicator(): TemplateResult<1> | string {
    return this.currentReplyTo && this.commentMap[this.currentReplyTo]
      ? html`<div class="info wtc-flex wtc-gap-md">
          ${this.i18n.t('replyingTo')}
          ${this.getDisplayName(this.commentMap[this.currentReplyTo])}<button
            type="button"
            class="cancel-link wtc-clickable wtc-transition wtc-reset-button"
            @click=${() => this.cancelReply()}
          >
            ${this.i18n.t('cancelReply')}
          </button>
        </div>`
      : '';
  }

  // Create edit status indicator
  private createEditIndicator(): TemplateResult<1> | string {
    return this.editingComment
      ? html`<div class="info wtc-flex wtc-gap-md">
          ${this.i18n.t('editing')} ${this.editingComment.id}<button
            type="button"
            class="cancel-link wtc-clickable wtc-transition wtc-reset-button"
            @click=${() => this.cancelEdit()}
          >
            ${this.i18n.t('cancelEdit')}
          </button>
        </div>`
      : '';
  }
  public async renderApp(): Promise<void> {
    const appTemplate = html`
      <div class="wtc-container">
        <div class="comment-box-container">
          <div id="comment-form-container" class="form-content"></div>
          <!-- <div class="admin-btn-wrapper">${this.createAdminButton()}</div> -->
        </div>
        <div id="comments-container"></div>
      </div>
    `;

    const appElement = document.getElementById(this.elementId);
    if (appElement) {
      render(appTemplate, appElement);
      this.renderForm();
      await this.renderCommentsList();
      this.renderMarkdownHelp();
    }
  }

  public async refresh(): Promise<void> {
    this.comments = [];
    await this.renderCommentsList();
  }
}

export default initWontonComment;
