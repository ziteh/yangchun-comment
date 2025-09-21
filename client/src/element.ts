import snarkdown from 'snarkdown';
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { Comment } from '@yangchun-comment/shared';
import { createApiService } from './utils/apiService';
import { createI18n, en, zhHant, type I18nStrings } from './utils/i18n';
import { generatePseudonymAndHash } from './utils/pseudonym';
import { sanitizeHtml, setupDOMPurifyHooks } from './utils/sanitize';
import { formatDate } from './utils/format';
import { createPreviewTemplate } from './views/preview';
import { createCommentsTemplate as renderCommentsView } from './views/comments';
import type { CommentMap, TabType } from './types';
import './index.css';

export class YangchunCommentElement extends LitElement {
  static readonly MAX_NAME_LENGTH = 25;
  static readonly MAX_MESSAGE_LENGTH = 1000;
  private static readonly MY_NAME_HASHES_KEY = 'ycc_my_name_hashes';

  @property({ type: String }) post = '/blog/my-post';
  @property({ type: String }) apiUrl = 'http://localhost:8787/';
  @property({ type: String }) authorName: string | undefined = undefined;
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

  protected createRenderRoot() {
    return this;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.syncI18n();
    this.apiService = createApiService(this.apiUrl);
    setupDOMPurifyHooks();
    this.reloadComments();
  }

  disconnectedCallback(): void {
    document.body.classList.remove('ycc-modal-open');
    super.disconnectedCallback();
  }

  protected updated(changed: Map<string, unknown>) {
    if (changed.has('apiUrl')) this.apiService = createApiService(this.apiUrl);
    if (changed.has('language')) this.syncI18n();
    if (changed.has('post')) this.reloadComments();
  }

  private syncI18n() {
    let languageStrings: I18nStrings = en;
    const lang = this.language;
    if (typeof lang === 'string') languageStrings = lang === 'zh-Hant' ? zhHant : en;
    else if (lang && typeof lang === 'object') languageStrings = lang;
    this.i18n = createI18n(languageStrings);
  }

  public renderMarkdown(md: string): ReturnType<typeof unsafeHTML> {
    return unsafeHTML(sanitizeHtml(snarkdown(md || '')));
  }

  public getDisplayName(comment: Comment | undefined): string {
    if (comment?.isAdmin && this.authorName) return this.authorName;
    const cleaned = comment?.pseudonym ?? '';
    return cleaned.trim() ? cleaned : this.i18n.t('anonymous');
  }

  public canEditComment(commentId: string): boolean {
    return this.apiService.canEditComment(commentId);
  }

  private saveMyNameHash(nameHash: string): void {
    try {
      const arr = this.getMyNameHashes();
      if (nameHash && !arr.includes(nameHash)) {
        arr.push(nameHash);
        localStorage.setItem(YangchunCommentElement.MY_NAME_HASHES_KEY, JSON.stringify(arr));
      }
    } catch (e) {
      console.warn('Failed to save name hash:', e);
    }
  }

  private getMyNameHashes(): string[] {
    try {
      const stored = localStorage.getItem(YangchunCommentElement.MY_NAME_HASHES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn('Failed to get name hashes:', e);
      return [];
    }
  }

  public isMyComment(comment: Comment): boolean {
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

  // moved preview template to views/preview.ts

  public switchTab(tab: 'write' | 'preview'): void {
    this.activeTab = tab;
    if (tab === 'preview') this.saveCurrentFormInputs();
  }
  private saveCurrentFormInputs(): void {
    const nameInput = document.querySelector(
      '#comment-form input[name="name"]',
    ) as HTMLInputElement;
    if (nameInput) this.previewName = nameInput.value;
  }

  private async renderCommentsList(): Promise<void> {
    if (this.comments.length === 0) await this.reloadComments();
  }

  private buildCommentMap(): void {
    this.commentMap = {};
    this.comments.forEach((c) => {
      this.commentMap[c.id] = c;
    });
  }
  private createCommentsTemplate(): TemplateResult {
    return renderCommentsView(this);
  }

  public setReplyTo(commentId: string): void {
    if (this.editingComment) {
      this.editingComment = null;
      this.previewText = '';
      this.previewName = '';
      this.previewPseudonym = '';
    }
    this.currentReplyTo = commentId;
    const form = (this as unknown as HTMLElement).querySelector('#comment-form-container');
    if (form) (form as HTMLElement).scrollIntoView({ behavior: 'smooth' });
  }
  private cancelReply(): void {
    this.currentReplyTo = null;
  }

  private handleInputChange(e: Event): void {
    this.previewText = (e.target as HTMLTextAreaElement).value;
  }
  private async handleNameInputChange(e: Event): Promise<void> {
    const target = e.target as HTMLInputElement;
    this.previewName = target.value;
    if (target.value.trim()) {
      try {
        const { pseudonym } = await generatePseudonymAndHash(target.value);
        this.previewPseudonym = pseudonym;
      } catch {
        this.previewPseudonym = '';
      }
    } else {
      this.previewPseudonym = '';
    }
  }

  private async handleSubmit(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const originalName = fd.get('name') as string;
    const message = fd.get('message') as string;
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
    let pseudonym: string;
    let hash: string;
    if (this.editingComment) {
      pseudonym = this.editingComment.pseudonym || '';
      hash = this.editingComment.nameHash || '';
    } else {
      const r = await generatePseudonymAndHash(originalName || '');
      pseudonym = r.pseudonym;
      hash = r.hash;
    }
    const success = await this.processSubmission(pseudonym, hash, message);
    if (success) {
      this.resetFormState();
      this.comments.length = 0;
      await this.renderCommentsList();
    }
  }

  private async processSubmission(
    pseudonym: string,
    nameHash: string,
    message: string,
  ): Promise<boolean> {
    if (this.editingComment) {
      const success = await this.apiService.updateComment(
        this.post,
        this.editingComment.id,
        this.editingComment.pseudonym || '',
        this.editingComment.nameHash || '',
        message,
      );
      if (!success) alert(this.i18n.t('editFailed'));
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

  private resetFormState(): void {
    const form = document.querySelector('#comment-form') as HTMLFormElement;
    if (form) form.reset();
    this.previewText = '';
    this.previewName = '';
    this.previewPseudonym = '';
    this.editingComment = null;
    this.currentReplyTo = null;
  }

  public async handlePreviewSubmit(): Promise<void> {
    if (this.previewName && this.previewName.length > YangchunCommentElement.MAX_NAME_LENGTH) {
      alert(
        `${this.i18n.t('nameTooLong')} (${this.previewName.length}/${YangchunCommentElement.MAX_NAME_LENGTH})`,
      );
      return;
    }
    if (this.previewText.length > YangchunCommentElement.MAX_MESSAGE_LENGTH) {
      alert(
        `${this.i18n.t('messageTooLong')} (${this.previewText.length}/${YangchunCommentElement.MAX_MESSAGE_LENGTH})`,
      );
      return;
    }
    let pseudonym: string;
    let hash: string;
    if (this.editingComment) {
      pseudonym = this.editingComment.pseudonym || '';
      hash = this.editingComment.nameHash || '';
    } else {
      const g = await generatePseudonymAndHash(this.previewName);
      pseudonym = g.pseudonym;
      hash = g.hash;
    }
    const success = await this.processSubmission(pseudonym, hash, this.previewText);
    if (success) {
      this.resetPreviewState();
      this.comments.length = 0;
      await this.renderCommentsList();
    }
  }

  private resetPreviewState(): void {
    this.previewText = '';
    this.previewName = '';
    this.previewPseudonym = '';
    this.editingComment = null;
    this.currentReplyTo = null;
    this.switchTab('write');
    const form = document.querySelector('#comment-form') as HTMLFormElement;
    if (form) form.reset();
  }

  public async handleDelete(commentId: string): Promise<void> {
    if (!confirm(this.i18n.t('confirmDelete'))) return;
    const success = await this.apiService.deleteComment(this.post, commentId);
    if (success) {
      this.comments.length = 0;
      await this.renderCommentsList();
    } else {
      alert(this.i18n.t('deleteFailed'));
    }
  }

  public handleEdit(comment: Comment): void {
    this.clearReplyState();
    this.setEditingState(comment);
    this.populateFormWithComment(comment);
    this.scrollToForm();
  }
  private clearReplyState(): void {
    if (this.currentReplyTo) this.currentReplyTo = null;
  }
  private setEditingState(comment: Comment): void {
    this.editingComment = comment;
    this.previewText = comment.msg || '';
    this.previewName = comment.pseudonym || '';
    this.previewPseudonym = comment.pseudonym || '';
  }
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
    }
    if (messageInput) {
      messageInput.value = comment.msg || '';
      this.previewText = comment.msg || '';
    }
  }
  private scrollToForm(): void {
    const form = document.querySelector('#comment-form-container');
    if (form) (form as HTMLElement).scrollIntoView({ behavior: 'smooth' });
  }
  private cancelEdit(): void {
    this.editingComment = null;
    this.clearFormAndPreview();
  }
  private clearFormAndPreview(): void {
    const form = document.querySelector('#comment-form') as HTMLFormElement;
    if (form) form.reset();
    this.previewText = '';
    this.previewName = '';
    this.previewPseudonym = '';
  }

  public toggleMarkdownHelp(): void {
    this.showMarkdownHelp = !this.showMarkdownHelp;
    this.updateBodyScrollLock();
  }
  private createMarkdownHelpTemplate() {
    return html` <div id="markdown-help-modal" class="active">
      <div class="markdown-help-container ycc-flex">
        <div
          class="markdown-help-backdrop ycc-clickable"
          @click=${() => this.toggleMarkdownHelp()}
        ></div>
        <div class="markdown-help-content" role="dialog" aria-modal="true">
          <button
            class="markdown-help-close ycc-clickable ycc-reset-button"
            @click=${() => this.toggleMarkdownHelp()}
            aria-label="Close"
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
              >Yang Chun Comment</a
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
    </div>`;
  }

  private createFormTemplate(): TemplateResult {
    return html`
      ${this.activeTab === 'preview' ? createPreviewTemplate(this) : this.createFormContent()}
      ${this.createStatusIndicators()}
      ${this.showMarkdownHelp ? this.createMarkdownHelpTemplate() : nothing}
      ${this.showAdminLogin ? this.createAdminLoginTemplate() : nothing}
    `;
  }

  private createFormContent(): TemplateResult {
    return html` <div class="comment-box">
      <div id="form-content" class="${this.activeTab === 'write' ? 'active' : ''}">
        <form
          id="comment-form"
          class="ycc-reset-form"
          @submit=${(e: SubmitEvent) => this.handleSubmit(e)}
        >
          <div class="honeypot-field">
            <input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />
          </div>
          ${this.createTextareaSection()} ${this.createFormFooter()}
        </form>
      </div>
    </div>`;
  }

  private createTextareaSection(): TemplateResult {
    return html` <div class="comment-input">
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
    </div>`;
  }

  private createFormFooter(): TemplateResult {
    return html` <div class="comment-footer ycc-flex ycc-flex-wrap ycc-gap-xs">
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
    </div>`;
  }

  private createFormButtons(): TemplateResult {
    return html` <button
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
      </button>`;
  }

  private createAdminButton(): TemplateResult {
    return html`<button
      type="button"
      class="admin-btn ycc-clickable ycc-reset-button"
      title="Admin"
      @click=${() => this.showAdminModal()}
    >
      ⚙
    </button>`;
  }
  private showAdminModal(): void {
    this.showAdminLogin = true;
    this.updateBodyScrollLock();
  }
  private hideAdminModal(): void {
    this.showAdminLogin = false;
    this.updateBodyScrollLock();
  }
  private updateBodyScrollLock(): void {
    const lock = this.showMarkdownHelp || this.showAdminLogin;
    document.body.classList.toggle('ycc-modal-open', lock);
  }

  private createAdminLoginTemplate(): TemplateResult {
    return html`<div
      class="admin-modal-backdrop ycc-clickable"
      @click=${() => this.hideAdminModal()}
    >
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
            <label for="admin-username">Username:</label
            ><input type="text" id="admin-username" name="username" required autocomplete="off" />
          </div>
          <div class="admin-form-group">
            <label for="admin-password">Password:</label
            ><input
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
    </div>`;
  }

  private async handleAdminLogin(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const username = fd.get('username') as string;
    const password = fd.get('password') as string;
    try {
      const res = await fetch(`${this.apiUrl}admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        await res.text();
        alert('Admin login successful!');
        this.hideAdminModal();
      } else {
        alert('Admin login failed!');
      }
    } catch (err) {
      console.error('Admin login error:', err);
      alert('Admin login error!');
    }
  }

  private createStatusIndicators(): TemplateResult | typeof nothing {
    const replyIndicator = this.createReplyIndicator();
    const editIndicator = this.createEditIndicator();
    const hasAny = replyIndicator !== '' || editIndicator !== '';
    return hasAny ? html`${replyIndicator}${editIndicator}` : nothing;
  }
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
    return html` <div class="ycc-container">
      <div class="comment-box-container">
        <div id="comment-form-container" class="form-content">${this.createFormTemplate()}</div>
        <!-- <div class="admin-btn-wrapper">${this.createAdminButton()}</div> -->
      </div>
      <div id="comments-container">${this.createCommentsTemplate()}</div>
    </div>`;
  }

  public async refresh(): Promise<void> {
    await this.reloadComments();
  }

  public get i18n$() {
    return this.i18n;
  }
  public get commentMap$() {
    return this.commentMap;
  }
  public get currentReplyTo$() {
    return this.currentReplyTo;
  }
  public get previewText$() {
    return this.previewText;
  }
  public get previewPseudonym$() {
    return this.previewPseudonym;
  }
  public get editingComment$() {
    return this.editingComment;
  }
  public get comments$() {
    return this.comments;
  }

  public formatDate(ts: number): string {
    return formatDate(ts);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'yangchun-comment': YangchunCommentElement;
  }
}
