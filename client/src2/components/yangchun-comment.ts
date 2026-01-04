import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { yangChunCommentStyles } from './yangchun-comment.styles';
import type { Comment } from '@ziteh/yangchun-comment-shared';
import './comment-input';
import './comment-info';
import './list/comment-list';
import type { ApiService } from '../api/apiService';
import { createMockApiService } from '../api/apiService.mock';
import { generatePseudonymAndHash } from '../utils/pseudonym';

@customElement('yangchun-comment')
export class YangChunComment extends LitElement {
  static properties = {
    post: { type: String },
    apiUrl: { type: String },
    authorName: { type: String },
    // TODO: i18n
  };
  post = '';
  apiUrl = '';
  authorName = '';

  static styles = yangChunCommentStyles;

  @state() private accessor apiService: ApiService = createMockApiService();

  @state() private accessor draft = '';
  @state() private accessor nickname = '';
  @state() private accessor comments: Comment[] = [];

  @state() private accessor referenceComment: Comment | null = null;
  @state() private accessor isReply = true; // true: reply, false: edit

  render() {
    return html`
      <div class="root" part="root">
        <!-- <slot></slot> -->
        <comment-input
          .message=${this.draft}
          .nickname=${this.nickname}
          @comment-change=${this.onDraftChange}
          @nickname-change=${this.onNicknameChange}
          @comment-submit=${this.onDraftSubmit}
        ></comment-input>
        <comment-info
          .comment=${this.referenceComment}
          .isReply=${this.isReply}
          @reference-comment-cancel=${this.onCommentInfoCancel}
        ></comment-info>
        <comment-list
          .comments=${this.comments}
          @comment-reply=${this.onReplyToComment}
        ></comment-list>
      </div>
    `;
  }

  async firstUpdated() {
    console.debug('firstUpdated');
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
    }
  }

  private onDraftChange(e: CustomEvent<string>) {
    this.draft = e.detail.trim();
  }

  private onNicknameChange(e: CustomEvent<string>) {
    this.nickname = e.detail.trim();
  }

  private async onDraftSubmit() {
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
      await this.updatedComments();
    } catch (err) {
      console.error('Failed to add comment:', err);
      return;
    }
  }

  private onReplyToComment(e: CustomEvent<string>) {
    const commentId = e.detail;
    console.debug('Reply to comment ID:', commentId);
    this.referenceComment = this.comments.find((cmt) => cmt.id === commentId) || null;
    this.isReply = true;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'yangchun-comment': YangChunComment;
  }
}
