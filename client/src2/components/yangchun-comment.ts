import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { yangChunCommentStyles } from './yangchun-comment.styles';
import type { Comment } from '@ziteh/yangchun-comment-shared';
import './comment-input';
import './comment-info';
import './list/comment-list';
import type { ApiService } from '../api/apiService';
import { createMockApiService } from '../api/apiService.mock';

@customElement('yangchun-comment')
export class YangChunComment extends LitElement {
  static styles = yangChunCommentStyles;

  date = Date.now(); // test

  @state() private accessor apiService: ApiService = createMockApiService();

  @state() private accessor draft = '';
  @state() private accessor nickname = '';
  @state() private accessor comments: Comment[] = [
    // test
    // {
    //   id: 'a0',
    //   msg: 'a0',
    //   pubDate: this.date,
    // },
    // {
    //   id: 'a1',
    //   msg: 'a1',
    //   pubDate: this.date + 1000,
    //   replyTo: 'a0',
    // },
    // {
    //   id: 'b0',
    //   msg: 'b0',
    //   pubDate: this.date + 2000,
    // },
    // {
    //   id: 'b1',
    //   msg: 'b1',
    //   pubDate: this.date + 3000,
    //   replyTo: 'b0',
    // },
    // {
    //   id: 'b2',
    //   msg: 'b2',
    //   pubDate: this.date + 4000,
    //   replyTo: 'b0',
    // },
    // {
    //   id: 'b21',
    //   msg: 'b21',
    //   pubDate: this.date + 6000,
    //   replyTo: 'b2',
    // },
    // {
    //   id: 'b22',
    //   msg: 'b22',
    //   pubDate: this.date + 6000,
    //   replyTo: 'b21',
    // },
    // {
    //   id: 'b23',
    //   msg: 'b23',
    //   pubDate: this.date + 7000,
    //   replyTo: 'b2',
    // },
  ];

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
    this.comments = await this.apiService.getComments('default-post');
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

  private onDraftSubmit() {
    const pureDraft = this.draft.trim();
    if (!pureDraft) return;

    const newComment: Comment = {
      id: crypto.randomUUID(), // TODO
      msg: pureDraft,
      pseudonym: this.nickname, // TODO
      pubDate: Date.now(),
      replyTo: this.referenceComment ? this.referenceComment.id : undefined,
    };

    this.comments = [...this.comments, newComment];
    this.draft = '';
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
