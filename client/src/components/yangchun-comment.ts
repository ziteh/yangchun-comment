import { LitElement, css, html, type PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { yangChunCommentStyles } from './yangchun-comment.styles';
import type { Comment } from '@ziteh/yangchun-comment-shared';
import './comment-input';
import { CommentInput } from './comment-input';
import './comment-info';
import './comment-dialog';
import './list/comment-list';
import './comment-admin';
import type { CommentAdmin } from './comment-admin';
import type { ApiService } from '../api/apiService';
import { createApiService } from '../api/apiService';
import { generatePseudonymAndHash } from '../utils/pseudonym';
import { initI18n, enUS, zhTW, t, type I18nStrings } from '../utils/i18n';
import { cleanupPowWorker } from '../utils/pow';

@customElement('yangchun-comment')
export class YangChunComment extends LitElement {
  static styles = [
    yangChunCommentStyles,
    css`
      :host {
        display: block;
      }
      .dialog-actions {
        margin-top: var(--ycc-spacing-m);
        display: flex;
        justify-content: flex-end;
        gap: var(--ycc-spacing-s);
      }
      .help-content {
        display: flex;
        flex-direction: column;
        gap: var(--ycc-spacing-m);
      }
      .help-desc p {
        margin: 0 0 var(--ycc-spacing-s) 0;
      }
      .help-desc p:last-child {
        margin-bottom: 0;
      }
      .help-md-sample {
        background-color: var(--ycc-bg-secondary);
        padding: var(--ycc-spacing-m);
        border-radius: var(--ycc-radius);
        font-family: var(--ycc-font-monospace);
        font-size: 0.9em;
        line-height: 1.6;
        white-space: pre;
        overflow-x: auto;
        margin: 0;
      }
      .help-footer {
        font-size: 0.85em;
        color: var(--ycc-text-secondary);
        text-align: center;
        margin-top: var(--ycc-spacing-xs);
      }
      .help-footer a {
        color: var(--ycc-primary-color);
        text-decoration: none;
      }
      .help-footer a:hover {
        text-decoration: underline;
      }
    `,
  ];

  @property({ type: String }) accessor post = '';
  @property({ type: String }) accessor apiUrl = 'http://localhost:8787';
  @property({ type: String }) accessor authorName = '';
  @property({ type: String }) accessor lang = 'en-US';
  @property({ type: Number }) accessor prePowDifficulty = 2;
  @property({ type: String }) accessor prePowMagicWord = 'MAGIC';
  @property({ type: Object, attribute: false }) accessor customMessages: I18nStrings | undefined;

  @state() private accessor apiService!: ApiService;

  @state() private accessor draft = '';
  @state() private accessor nickname = '';
  @state() private accessor comments: Comment[] = [];
  @state() private accessor editPseudonym = ''; // for editing comment the pseudonym does not change
  @state() private accessor deleteCommentId = '';

  @state() private accessor referenceComment: Comment | null = null;
  @state() private accessor isReply = true; // true: reply, false: edit

  @state() private accessor showAdmin = false;
  @state() private accessor showHelp = false;
  @state() private accessor showNotify = false;

  @state() private accessor isAdmin = false;
  @state() private accessor rssFeedUrl = '';

  @state() private accessor errorMessage = '';

  @query('comment-input') private accessor commentInput!: CommentInput;
  @query('comment-admin') private accessor commentAdmin!: CommentAdmin;

  render() {
    const HelpContent = html`
      <div class="help-content">
        <div class="help-desc">
          ${t('helpDesc')
            .split('\n')
            .map((line) => html`<p>${line}</p>`)}
        </div>
        <pre class="help-md-sample">
[${t('helpMdLink')}](https://example.com)

![${t('helpMdImage')}](https://example.com/img.jpg)

*${t('helpMdItalic')}*

**${t('helpMdBold')}**

- ${t('helpMdList')}

1. ${t('helpMdOrderedList')}

\`${t('helpMdInlineCode')}\`

\`\`\`
${t('helpMdCodeBlock')}
\`\`\`</pre
        >
        <div class="help-footer">
          Powered by${' '}
          <a href="https://ycc.ziteh.dev/" rel="noopener noreferrer" target="_blank">
            Yang Chun Comment
          </a>
          (<a
            href="https://github.com/ziteh/yangchun-comment"
            rel="noopener noreferrer"
            target="_blank"
            >GitHub</a
          >)
        </div>
      </div>
    `;
    return html`
      <div class="root" part="root">
        <!-- <slot></slot> -->
        <comment-input
          .message=${this.draft}
          .nickname=${this.nickname}
          .editPseudonym=${this.editPseudonym}
          .authorName=${this.authorName}
          .isAdmin=${this.isAdmin}
          @comment-change=${this.onDraftChange}
          @nickname-change=${this.onNicknameChange}
          @comment-submit=${this.onDraftSubmit}
        ></comment-input>
        <comment-info
          .comment=${this.referenceComment}
          .isReply=${this.isReply}
          .errorMessage=${this.errorMessage}
          @error-clear=${() => (this.errorMessage = '')}
          @reference-comment-cancel=${this.onCommentInfoCancel}
          @notify-request=${() => (this.showNotify = true)}
          @help-request=${() => (this.showHelp = true)}
          @admin-request=${() => (this.showAdmin = true)}
        ></comment-info>
        <comment-list
          .comments=${this.comments}
          .author=${this.authorName}
          .canEditCallback=${this.apiService.canEditComment}
          .isMyCommentCallback=${this.apiService.isMyComment}
          @comment-reply=${this.onReplyToComment}
          @comment-edit=${this.onEditComment}
          @comment-delete=${(e: CustomEvent<string>) => {
            this.deleteCommentId = e.detail;
          }}
        ></comment-list>

        <comment-dialog
          header=${t('confirmDelete')}
          .open=${this.deleteCommentId !== ''}
          @close=${() => (this.deleteCommentId = '')}
        >
          <p>${t('confirmDeleteDesc1') + this.deleteCommentId}</p>
          <strong>${t('confirmDeleteDesc2')}</strong>
          <div class="dialog-actions">
            <button class="secondary" @click=${this.deleteComment}>${t('delete')}</button>
            <button @click=${() => (this.deleteCommentId = '')}>${t('cancel')}</button>
          </div>
        </comment-dialog>
        <comment-dialog
          header="Admin"
          .open=${this.showAdmin}
          @close=${() => (this.showAdmin = false)}
        >
          <comment-admin
            .apiService=${this.apiService}
            @auth-status-change=${this.onAuthStatusChange}
          ></comment-admin>
        </comment-dialog>
        <comment-dialog
          header=${t('notify')}
          .open=${this.showNotify}
          @close=${() => (this.showNotify = false)}
        >
          <p>${t('notifyDesc')}</p>
          <a href="${this.rssFeedUrl}" target="_blank" rel="noopener noreferrer">RSS feed</a>
        </comment-dialog>
        <comment-dialog
          header=${t('help')}
          .open=${this.showHelp}
          @close=${() => (this.showHelp = false)}
        >
          ${HelpContent}
        </comment-dialog>
      </div>
    `;
  }

  protected willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('customMessages') || changedProperties.has('lang')) {
      if (this.customMessages) {
        initI18n(this.customMessages);
      } else {
        const availableLangs = [enUS, zhTW];
        const selectedLang = availableLangs.find((l) => l.bcp47 === this.lang) || enUS;
        initI18n(selectedLang);
      }
    }

    // Initialize apiService when apiUrl changes
    if (
      (changedProperties.has('apiUrl') ||
        changedProperties.has('prePowDifficulty') ||
        changedProperties.has('prePowMagicWord')) &&
      this.apiUrl
    ) {
      console.debug('Initializing API service with URL:', this.apiUrl);
      this.apiService = createApiService(this.apiUrl, this.prePowDifficulty, this.prePowMagicWord);

      const rssUrl = new URL('/rss/thread', this.apiUrl);
      rssUrl.searchParams.append('post', this.post);
      this.rssFeedUrl = rssUrl.href;
    }

    super.willUpdate(changedProperties);
  }

  protected updated(changedProperties: PropertyValues<this>) {
    super.updated(changedProperties);
    // Re-fetch comments when post ID changes
    if (changedProperties.has('post')) {
      this.updatedComments();
    }
  }

  async firstUpdated() {
    console.debug('firstUpdated', 'apiUrl:', this.apiUrl);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    cleanupPowWorker();
  }

  private async updatedComments() {
    try {
      const response = await this.apiService.getComments(this.post);
      this.comments = response.comments;
      // Update comment-admin component with admin status if available
      if (response.isAdmin !== undefined && this.commentAdmin) {
        this.commentAdmin.updateAuthStatus(response.isAdmin);
      }
    } catch (err) {
      console.error('Error updating comments:', err);
    }
  }

  private async onCommentInfoCancel(e: CustomEvent<string>) {
    const commentId = e.detail;
    console.debug('Cancel reply to comment ID:', commentId);
    if (this.referenceComment?.id === commentId) {
      this.referenceComment = null;
      this.isReply = true;
      await this.updateComplete;
      this.commentInput?.focus();
    }
  }

  private onDraftChange(e: CustomEvent<string>) {
    this.draft = e.detail;
  }

  private onNicknameChange(e: CustomEvent<string>) {
    this.nickname = e.detail;
  }

  private async editedSubmit() {
    if (!this.referenceComment) return;
    if (this.isReply) return;

    const pureDraft = this.draft.trim();
    if (!pureDraft) return;

    try {
      const ok = this.apiService.updateComment(
        this.post,
        this.referenceComment.id,
        this.referenceComment.pseudonym || '',
        pureDraft,
      );

      console.debug('Edit comment ID:', this.referenceComment.id, ok);
      this.draft = '';
      this.editPseudonym = '';
      this.referenceComment = null;
      this.isReply = true;

      await this.updatedComments();
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  }

  private async onDraftSubmit() {
    if (this.referenceComment && !this.isReply) {
      await this.editedSubmit();
      await this.updatedComments();
      return;
    }

    const pureDraft = this.draft.trim();
    if (!pureDraft) return;

    const { pseudonym } = await generatePseudonymAndHash(this.nickname);
    const replyTo =
      this.referenceComment && this.referenceComment.id && this.isReply
        ? this.referenceComment.id
        : undefined;

    try {
      const id = await this.apiService.addComment(this.post, pseudonym, pureDraft, replyTo);
      console.debug('Added comment ID:', id);
      this.draft = '';
      this.editPseudonym = '';
      this.referenceComment = null;

      await this.updatedComments();
    } catch (err) {
      console.error('Failed to add comment:', err);
      this.errorMessage = (err as Error).message || 'Failed to add comment. Please try again.';
      return;
    }
  }

  private async onReplyToComment(e: CustomEvent<string>) {
    const commentId = e.detail;
    console.debug('Reply to comment ID:', commentId);

    const refComment = this.comments.find((cmt) => cmt.id === commentId);
    if (!refComment) {
      this.referenceComment = null;
      return;
    }
    if (!this.isReply) {
      this.draft = ''; // If was editing, cancel editing first
    }
    this.referenceComment = refComment;
    this.isReply = true;
    await this.updateComplete;
    this.commentInput?.focus();
  }

  private async onEditComment(e: CustomEvent<string>) {
    const commentId = e.detail;
    console.debug('Edit comment ID:', commentId);

    const refComment = this.comments.find((cmt) => cmt.id === commentId);
    if (!refComment) {
      this.referenceComment = null;
      return;
    }
    this.referenceComment = refComment;
    this.isReply = false;
    this.draft = refComment.msg || '';
    this.editPseudonym = refComment.pseudonym || '';
    await this.updateComplete;
    this.commentInput?.focus();
  }

  private onAuthStatusChange = (e: CustomEvent<boolean>) => {
    this.isAdmin = e.detail;
  };

  private async deleteComment() {
    if (!this.deleteCommentId) return;
    const commentId = this.deleteCommentId;
    console.debug('Delete comment ID:', commentId);

    try {
      const ok = await this.apiService.deleteComment(this.post, commentId);
      if (ok) {
        console.debug('Deleted comment ID:', commentId);
        this.deleteCommentId = ''; // Close dialog
        await this.updatedComments();
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
      this.deleteCommentId = ''; // Close dialog even on error
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'yangchun-comment': YangChunComment;
  }
}
