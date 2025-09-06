import DOMPurify, { type Config as dompurifyConfig } from 'dompurify';
import snarkdown from 'snarkdown';
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { Comment } from '@yangchun-comment/shared';
import { createApiService } from './apiService';
import { createI18n, en, zhHant, type I18nStrings } from './i18n';
import { generatePseudonymAndHash } from './utils/pseudonym';
import './index.css';

type CommentMap = Record<string, Comment>;

type TabType = 'write' | 'preview';

export function initYangchunComment(
  elementId = 'ycc-app',
  options: {
    post?: string;
    apiUrl?: string;
    language?: 'en' | 'zh-Hant' | I18nStrings;
    authorName?: string;
  } = {},
) {
  const host = document.getElementById(elementId);
  if (!host) throw new Error(`Container #${elementId} not found`);

  const el = document.createElement('yangchun-comment') as unknown as YangchunCommentElement;
  if (options.post) el.post = options.post;
  if (options.apiUrl) el.apiUrl = options.apiUrl;
  if (options.authorName) el.authorName = options.authorName;
  if (options.language) el.language = options.language as 'en' | 'zh-Hant' | I18nStrings;
  host.innerHTML = '';
  host.appendChild(el);
  return el;
}

export class YangchunCommentElement extends LitElement {
  static readonly MAX_NAME_LENGTH = 25;
  static readonly MAX_MESSAGE_LENGTH = 1000;
  private static readonly MY_NAME_HASHES_KEY = 'ycc_my_name_hashes';

  @property({ type: String }) post = '/blog/my-post';
  @property({ type: String }) apiUrl = 'http://localhost:8787/';
  @property({ type: String }) authorName: string | undefined = undefined;
  // allow passing 'en' | 'zh-Hant' | custom strings via property (not attribute)
  @property({ attribute: false }) language: 'en' | 'zh-Hant' | I18nStrings = 'en';

  private apiService: ReturnType<typeof createApiService> = createApiService(this.apiUrl);
  private i18n: ReturnType<typeof createI18n> = createI18n(en);

  @state() private commentMap: CommentMap = {};
  @state() private comments: Comment[] = [];
  @state() private currentReplyTo: string | null = null;
  @state() private previewText = '';
  @state() private previewName = '';
  @state() private previewPseudonym = '';
  @state() private editingComment: Comment | null = null;
  @state() private activeTab: TabType = 'write';
  @state() private showMarkdownHelp = false;
  @state() private showAdminLogin = false;

  // no-op constructor

  // keep global CSS from index.css by rendering into light DOM
  protected createRenderRoot() {
    return this;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.syncI18n();
    this.apiService = createApiService(this.apiUrl);
    this.setupDOMPurify();
    // initial load
    this.reloadComments();
  }

  protected updated(changed: Map<string, unknown>) {
    if (changed.has('apiUrl')) {
      this.apiService = createApiService(this.apiUrl);
    }
    if (changed.has('language')) {
      this.syncI18n();
    }
    if (changed.has('post')) {
      this.reloadComments();
    }
  }

  private syncI18n() {
    let languageStrings: I18nStrings = en;
    const lang = this.language;
    if (typeof lang === 'string') {
      languageStrings = lang === 'zh-Hant' ? zhHant : en;
    } else if (lang && typeof lang === 'object') {
      languageStrings = lang;
    }
    this.i18n = createI18n(languageStrings);
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
        } catch {
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
    // 如果是管理員留言且有設定作者名稱，顯示作者名稱
    if (comment?.isAdmin && this.authorName) {
      return DOMPurify.sanitize(this.authorName, { ALLOWED_TAGS: [] });
    }

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
        localStorage.setItem(
          YangchunCommentElement.MY_NAME_HASHES_KEY,
          JSON.stringify(existingHashes),
        );
      }
    } catch (error) {
      console.warn('Failed to save name hash to localStorage:', error);
    }
  }

  private getMyNameHashes(): string[] {
    try {
      const stored = localStorage.getItem(YangchunCommentElement.MY_NAME_HASHES_KEY);
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

  private async reloadComments(): Promise<void> {
    this.comments = await this.loadComments();
    this.buildCommentMap();
  }

  // no-op: Lit manages input values via state

  private createPreviewTemplate(): TemplateResult {
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
        <div class="comment-footer ycc-flex ycc-gap-xs">
          <span style="flex: 1;"></span>
          <div class="ycc-flex ycc-gap-xs">
            <button
              type="button"
              class="help-btn ycc-clickable ycc-reset-button"
              title="${this.i18n.t('markdownHelp')}"
              @click=${() => this.toggleMarkdownHelp()}
            >
              ?
            </button>
            <button
              type="button"
              class="preview-btn ycc-clickable ycc-transition ycc-transparent-bg active ycc-reset-button"
              @click=${() => this.switchTab('write')}
            >
              ${this.i18n.t('write')}
            </button>
            <button
              type="button"
              class="submit-btn ycc-clickable ycc-transition ycc-reset-button"
              @click=${() => this.handlePreviewSubmit()}
            >
              ${this.editingComment ? this.i18n.t('updateComment') : this.i18n.t('submitComment')}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // no-op: rendering is managed by Lit via state

  private switchTab(tab: 'write' | 'preview'): void {
    this.activeTab = tab;
    if (tab === 'preview') this.saveCurrentFormInputs();
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
      await this.reloadComments();
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
  private createCommentsTemplate(): TemplateResult {
    if (this.comments.length === 0) {
      return html`
        <div id="comments">
          <div class="no-comments-message">${this.i18n.t('noComments')}</div>
        </div>
      `;
    }
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
    // focus form area
    const form = (this as unknown as HTMLElement).querySelector('#comment-form-container');
    if (form) (form as HTMLElement).scrollIntoView({ behavior: 'smooth' });
  }

  private cancelReply(): void {
    this.currentReplyTo = null;
    // state will trigger re-render
  }
  private handleInputChange(e: Event): void {
    const target = e.target as HTMLTextAreaElement;
    this.previewText = target.value;

    // Lit will re-render and update char count/state
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

    // Lit will re-render and update char count/state
  }

  // removed imperative char counter; counts are now reactive via state

  // Create comment item template with proper type annotation
  private createCommentItemTemplate(
    comment: Comment,
    isRoot = false,
    replyToName: string | null = null,
    allReplies: Comment[] | null = null,
    commentMap: CommentMap | null = null,
  ): TemplateResult {
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
      header: `${prefix}-header ycc-flex ycc-flex-wrap`,
      name: `${prefix}-name`,
      time: `${prefix}-time`,
      content: `${prefix}-content`,
    };
  } // Create comment header template
  private createCommentHeader(
    comment: Comment,
    cssClasses: ReturnType<typeof this.getCommentCssClasses>,
    replyToName: string | null,
    canEdit: boolean,
  ): TemplateResult {
    const isMyComment = this.isMyComment(comment);
    const isAdmin = comment.isAdmin;

    return html`
      <div class="${cssClasses.header}">
        <span class="${cssClasses.name}" title="${comment.id}">
          ${this.getDisplayName(comment)}
          ${isAdmin
            ? html`<span class="author-badge">${this.i18n.t('author')}</span>`
            : isMyComment
              ? html`<span class="my-comment-badge">Me</span>`
              : ''}
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
  ): TemplateResult | string {
    return replyToName
      ? html`<span class="reply-to">
          ${this.i18n.t('replyTo')}
          <span title="${replyToId ?? ''}">${replyToName}</span>
        </span>`
      : '';
  }

  // Create comment control buttons template
  private createCommentControls(canEdit: boolean, comment: Comment): TemplateResult | string {
    return canEdit
      ? html`<span class="comment-controls ycc-flex ycc-gap-xs">
          <button
            class="edit-button ycc-clickable ycc-transition ycc-transparent-bg ycc-reset-button"
            @click=${() => this.handleEdit(comment)}
          >
            ${this.i18n.t('edit')}
          </button>
          <button
            class="delete-button ycc-clickable ycc-transition ycc-transparent-bg ycc-reset-button"
            @click=${() => this.handleDelete(comment.id)}
          >
            ${this.i18n.t('delete')}
          </button>
        </span>`
      : '';
  }

  // Create comment content template
  private createCommentContent(comment: Comment, contentClass: string): TemplateResult {
    return html`<div class="${contentClass}">${this.renderMarkdown(comment.msg)}</div>`;
  }

  // Create comment actions template
  private createCommentActions(comment: Comment): TemplateResult {
    return html`
      <button
        class="reply-button ycc-clickable ycc-transition ycc-transparent-bg ycc-reset-button"
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
  ): TemplateResult | string {
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
    if (originalName && originalName.length > YangchunCommentElement.MAX_NAME_LENGTH) {
      alert(
        `${this.i18n.t('nameTooLong')} (${originalName.length}/${YangchunCommentElement.MAX_NAME_LENGTH})`,
      );
      return;
    }

    if (message.length > YangchunCommentElement.MAX_MESSAGE_LENGTH) {
      alert(
        `${this.i18n.t('messageTooLong')} (${message.length}/${YangchunCommentElement.MAX_MESSAGE_LENGTH})`,
      );
      return;
    }

    // Generate pseudonym and hash (only for new comments)
    let pseudonym: string;
    let hash: string;

    if (this.editingComment) {
      // When editing, use the original pseudonym and nameHash to prevent changes
      pseudonym = this.editingComment.pseudonym || '';
      hash = this.editingComment.nameHash || '';
    } else {
      // For new comments, generate from input name
      const { pseudonym: newPseudonym, hash: newHash } = await generatePseudonymAndHash(
        originalName || '',
      );
      pseudonym = newPseudonym;
      hash = newHash;
    }

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
      // When editing, use the original pseudonym and nameHash to prevent changes
      const success = await this.apiService.updateComment(
        this.post,
        this.editingComment.id,
        this.editingComment.pseudonym || '',
        this.editingComment.nameHash || '',
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
    // Lit will re-render
  }

  // Handle preview mode submission
  private async handlePreviewSubmit(): Promise<void> {
    // Validate lengths
    if (this.previewName && this.previewName.length > YangchunCommentElement.MAX_NAME_LENGTH) {
      alert(
        `${this.i18n.t('nameTooLong')} (${this.previewName.length}/${
          YangchunCommentElement.MAX_NAME_LENGTH
        })`,
      );
      return;
    }

    if (this.previewText.length > YangchunCommentElement.MAX_MESSAGE_LENGTH) {
      alert(
        `${this.i18n.t('messageTooLong')} (${this.previewText.length}/${
          YangchunCommentElement.MAX_MESSAGE_LENGTH
        })`,
      );
      return;
    }

    // Generate pseudonym and hash from original name (only for new comments)
    let pseudonym: string;
    let hash: string;

    if (this.editingComment) {
      // When editing, use the original pseudonym and nameHash
      pseudonym = this.editingComment.pseudonym || '';
      hash = this.editingComment.nameHash || '';
    } else {
      // For new comments, generate from input name
      const generated = await generatePseudonymAndHash(this.previewName);
      pseudonym = generated.pseudonym;
      hash = generated.hash;
    }

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
      // Lit will render name char count and over-limit class
    }

    if (messageInput) {
      messageInput.value = comment.msg || '';
      this.previewText = comment.msg || '';
      // Lit will render message char count and over-limit class
    }

    // Lit will re-render
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
  }

  // Toggle markdown help modal visibility
  private toggleMarkdownHelp(): void {
    this.showMarkdownHelp = !this.showMarkdownHelp;
  }

  // Render or hide markdown help modal
  // Lit will render modal via flag

  // modal helpers removed; flag drives rendering

  private createMarkdownHelpTemplate() {
    return html`
      <div class="markdown-help-container ycc-flex">
        <div
          class="markdown-help-backdrop ycc-clickable"
          @click=${() => this.toggleMarkdownHelp()}
        ></div>
        <div class="markdown-help-content">
          <button
            class="markdown-help-close ycc-clickable ycc-reset-button"
            @click=${() => this.toggleMarkdownHelp()}
          >
            ×
          </button>
          <h4>${this.i18n.t('commentSystemTitle')}</h4>
          <p>${this.i18n.t('commentSystemDesc')}</p>
          <p>${this.i18n.t('commentTimeLimit')}</p>
          <p>
            Powered by&nbsp;<a
              href="https://github.com/ziteh/yangchun-comment"
              target="_blank"
              rel="noopener noreferrer"
              >Yangchun</a
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

  private createFormTemplate(): TemplateResult {
    return html`
      ${this.activeTab === 'preview' ? this.createPreviewTemplate() : this.createFormContent()}
      ${this.createStatusIndicators()}
      ${this.showMarkdownHelp ? this.createMarkdownHelpTemplate() : nothing}
      ${this.showAdminLogin ? this.createAdminLoginTemplate() : nothing}
    `;
  }

  private createFormContent(): TemplateResult {
    return html`
      <div class="comment-box">
        <div id="form-content" class="${this.activeTab === 'write' ? 'active' : ''}">
          <form
            id="comment-form"
            class="ycc-reset-form"
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

  private createTextareaSection(): TemplateResult {
    return html`
      <div class="comment-input">
        <textarea
          name="message"
          placeholder="${this.i18n.t('messagePlaceholder')}"
          maxlength="${YangchunCommentElement.MAX_MESSAGE_LENGTH}"
          required
          .value=${this.previewText}
          @input=${(e: Event) => this.handleInputChange(e)}
        ></textarea>
        <div class="char-count">
          <span
            id="message-char-count"
            class="${this.previewText.length > YangchunCommentElement.MAX_MESSAGE_LENGTH
              ? 'over-limit'
              : ''}"
            >${this.previewText.length}</span
          >/${YangchunCommentElement.MAX_MESSAGE_LENGTH}
        </div>
      </div>
    `;
  }

  private createFormFooter(): TemplateResult {
    return html`
      <div class="comment-footer ycc-flex ycc-flex-wrap ycc-gap-xs">
        <div class="name-input-container">
          <input
            type="text"
            name="name"
            autocomplete="name"
            placeholder="${this.i18n.t('namePlaceholder')}"
            maxlength="${YangchunCommentElement.MAX_NAME_LENGTH}"
            ?disabled=${this.editingComment !== null}
            .value=${this.previewName}
            @input=${(e: Event) => this.handleNameInputChange(e)}
          />
          <div class="char-count" style="margin-top: 4px;">
            <span
              id="name-char-count"
              class="${this.previewName.length > YangchunCommentElement.MAX_NAME_LENGTH
                ? 'over-limit'
                : ''}"
              >${this.previewName.length}</span
            >/${YangchunCommentElement.MAX_NAME_LENGTH}
          </div>
          <div class="pseudonym-notice" style="font-size: 0.8em; color: #666; margin-top: 4px;">
            ${this.editingComment
              ? this.i18n.t('editingPseudonymNotice')
              : this.i18n.t('pseudonymNotice')}
          </div>
        </div>
        <div class="ycc-flex ycc-gap-xs">${this.createFormButtons()}</div>
      </div>
    `;
  }

  private createFormButtons(): TemplateResult {
    return html`
      <button
        type="button"
        class="help-btn ycc-clickable ycc-reset-button"
        title="${this.i18n.t('markdownHelp')}"
        @click=${() => this.toggleMarkdownHelp()}
      >
        ?
      </button>
      <button
        type="button"
        class="preview-btn ycc-clickable ycc-transition ycc-transparent-bg ycc-reset-button ${this
          .activeTab === 'preview'
          ? 'active'
          : ''}"
        @click=${() => this.switchTab(this.activeTab === 'preview' ? 'write' : 'preview')}
      >
        ${this.activeTab === 'preview' ? this.i18n.t('write') : this.i18n.t('preview')}
      </button>
      <button type="submit" class="submit-btn ycc-clickable ycc-transition ycc-reset-button">
        ${this.editingComment ? this.i18n.t('updateComment') : this.i18n.t('submitComment')}
      </button>
    `;
  }

  // Create admin button
  // TODO adjust position
  private createAdminButton(): TemplateResult {
    return html`
      <button
        type="button"
        class="admin-btn ycc-clickable ycc-reset-button"
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
  }

  // Hide admin login modal
  private hideAdminModal(): void {
    this.showAdminLogin = false;
  }

  // Render admin login modal
  // Lit handles modal via flag, no imperative render needed

  // Create admin login modal template
  private createAdminLoginTemplate(): TemplateResult {
    return html`
      <div class="admin-modal-backdrop ycc-clickable" @click=${() => this.hideAdminModal()}>
        <div class="admin-modal-content" @click=${(e: Event) => e.stopPropagation()}>
          <button
            class="admin-modal-close ycc-clickable ycc-reset-button"
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
            <button type="submit" class="admin-login-btn ycc-clickable ycc-reset-button">
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
  private createStatusIndicators(): TemplateResult | typeof nothing {
    const replyIndicator = this.createReplyIndicator();
    const editIndicator = this.createEditIndicator();
    const hasAny = replyIndicator !== '' || editIndicator !== '';
    return hasAny ? html`${replyIndicator}${editIndicator}` : nothing;
  }

  // Create reply status indicator
  private createReplyIndicator(): TemplateResult | string {
    return this.currentReplyTo && this.commentMap[this.currentReplyTo]
      ? html`<div class="info ycc-flex ycc-gap-md">
          ${this.i18n.t('replyingTo')}
          ${this.getDisplayName(this.commentMap[this.currentReplyTo])}<button
            type="button"
            class="cancel-link ycc-clickable ycc-transition ycc-reset-button"
            @click=${() => this.cancelReply()}
          >
            ${this.i18n.t('cancelReply')}
          </button>
        </div>`
      : '';
  }

  // Create edit status indicator
  private createEditIndicator(): TemplateResult | string {
    return this.editingComment
      ? html`<div class="info ycc-flex ycc-gap-md">
          ${this.i18n.t('editing')} ${this.editingComment.id}<button
            type="button"
            class="cancel-link ycc-clickable ycc-transition ycc-reset-button"
            @click=${() => this.cancelEdit()}
          >
            ${this.i18n.t('cancelEdit')}
          </button>
        </div>`
      : '';
  }
  protected render(): TemplateResult {
    return html`
      <div class="ycc-container">
        <div class="comment-box-container">
          <div id="comment-form-container" class="form-content">${this.createFormTemplate()}</div>
          <!-- <div class="admin-btn-wrapper">${this.createAdminButton()}</div> -->
        </div>
        <div id="comments-container">${this.createCommentsTemplate()}</div>
      </div>
    `;
  }

  public async refresh(): Promise<void> {
    await this.reloadComments();
  }
}

customElements.define('yangchun-comment', YangchunCommentElement);

export default initYangchunComment;

declare global {
  interface HTMLElementTagNameMap {
    'yangchun-comment': YangchunCommentElement;
  }
}
