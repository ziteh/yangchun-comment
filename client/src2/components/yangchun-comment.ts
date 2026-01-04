import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { yangChunCommentStyles } from './yangchun-comment.styles';
import type { Comment } from '@ziteh/yangchun-comment-shared';
import './comment-input';
import './comment-info';
import './comment-dialog';
import './list/comment-list';
import type { ApiService } from '../api/apiService';
import { createMockApiService } from '../api/apiService.mock';
import { generatePseudonymAndHash } from '../utils/pseudonym';
import { setupDOMPurifyHooks } from '../utils/sanitize';

const HelpContent = html`
  <p>Markdown is supported.</p>
  <ul>
    <li>**bold**</li>
    <li>*italic*</li>
    <li>[link](url)</li>
    <li>\`code\`</li>
  </ul>
`;

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
    `,
  ];

  static properties = {
    post: { type: String },
    apiUrl: { type: String },
    authorName: { type: String },
    // TODO: i18n
  };
  post = '';
  apiUrl = '';
  authorName = '';

  @state() private accessor apiService: ApiService = createMockApiService();

  @state() private accessor draft = '';
  @state() private accessor nickname = '';
  @state() private accessor comments: Comment[] = [];
  @state() private accessor editPseudonym = ''; // for editing comment the pseudonym does not change
  @state() private accessor deleteCommentId = '';

  @state() private accessor referenceComment: Comment | null = null;
  @state() private accessor isReply = true; // true: reply, false: edit

  @state() private accessor showHelp = false;
  @state() private accessor showNotify = false;
  @state() private accessor showConfirmDelete = false; // TODO: combine to deleteCommentId !== '' ?

  render() {
    return html`
      <div class="root" part="root">
        <!-- <slot></slot> -->
        <comment-input
          .message=${this.draft}
          .nickname=${this.nickname}
          .editPseudonym=${this.editPseudonym}
          @comment-change=${this.onDraftChange}
          @nickname-change=${this.onNicknameChange}
          @comment-submit=${this.onDraftSubmit}
        ></comment-input>
        <comment-info
          .comment=${this.referenceComment}
          .isReply=${this.isReply}
          @reference-comment-cancel=${this.onCommentInfoCancel}
          @notify-request=${() => (this.showNotify = true)}
          @help-request=${() => (this.showHelp = true)}
        ></comment-info>
        <comment-list
          .comments=${this.comments}
          .canEditCallback=${this.apiService.canEditComment}
          @comment-reply=${this.onReplyToComment}
          @comment-edit=${this.onEditComment}
          @comment-delete=${(e: CustomEvent<string>) => {
            this.deleteCommentId = e.detail;
            this.showConfirmDelete = true;
          }}
        ></comment-list>

        <comment-dialog
          header="Confirm Delete"
          .open=${this.showConfirmDelete && this.deleteCommentId !== ''}
          @close=${() => (this.showConfirmDelete = false)}
        >
          <p>Are you sure you want to delete this comment: ${this.deleteCommentId} ?</p>
          <strong>This action cannot be undone.</strong>
          <div class="dialog-actions">
            <button
              class="secondary"
              @click=${() => {
                this.showConfirmDelete = false;
                this.deleteComment();
              }}
            >
              Delete
            </button>
            <button
              @click=${() => {
                this.showConfirmDelete = false;
                this.deleteCommentId = '';
              }}
            >
              Cancel
            </button>
          </div>
        </comment-dialog>
        <comment-dialog
          header="Notify"
          .open=${this.showNotify}
          @close=${() => (this.showNotify = false)}
        >
          <p>Notification feature is coming soon!</p>
        </comment-dialog>
        <comment-dialog
          header="Help"
          .open=${this.showHelp}
          @close=${() => (this.showHelp = false)}
        >
          ${HelpContent}
        </comment-dialog>
      </div>
    `;
  }

  async firstUpdated() {
    console.debug('firstUpdated');
    setupDOMPurifyHooks(); // TODO: notice the order of initialization, connectedCallback?
    await this.updatedComments();
  }

  private async updatedComments() {
    const newComments = await this.apiService.getComments(this.post);
    this.comments = [...newComments];
  }

  private onCommentInfoCancel(e: CustomEvent<string>) {
    const commentId = e.detail;
    console.debug('Cancel reply to comment ID:', commentId);
    if (this.referenceComment?.id === commentId) {
      this.referenceComment = null;
      this.isReply = true;
    }
  }

  private onDraftChange(e: CustomEvent<string>) {
    this.draft = e.detail.trim();
  }

  private onNicknameChange(e: CustomEvent<string>) {
    this.nickname = e.detail.trim();
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
        this.referenceComment.nameHash || '',
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
      this.editedSubmit();
      return;
    }

    const pureDraft = this.draft.trim();
    if (!pureDraft) return;

    const { pseudonym, hash } = await generatePseudonymAndHash(this.nickname);
    const replyTo =
      this.referenceComment && this.referenceComment.id && this.isReply
        ? this.referenceComment.id
        : null;

    try {
      const id = await this.apiService.addComment(this.post, pseudonym, hash, pureDraft, replyTo);
      console.debug('Added comment ID:', id);
      this.draft = '';
      this.editPseudonym = '';
      this.referenceComment = null;

      await this.updatedComments();
    } catch (err) {
      console.error('Failed to add comment:', err);
      return;
    }
  }

  private onReplyToComment(e: CustomEvent<string>) {
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
  }

  private onEditComment(e: CustomEvent<string>) {
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
  }

  private async deleteComment() {
    if (!this.deleteCommentId) return;
    console.debug('Delete comment ID:', this.deleteCommentId);

    try {
      const ok = await this.apiService.deleteComment(this.post, this.deleteCommentId);
      if (ok) {
        console.debug('Deleted comment ID:', this.deleteCommentId);
        await this.updatedComments();
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'yangchun-comment': YangChunComment;
  }
}
