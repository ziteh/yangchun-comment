import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { yangChunCommentStyles } from './yangchun-comment.styles';
import type { Comment } from '@ziteh/yangchun-comment-shared';
import './comment-input';
import './list/comment-list';

@customElement('yangchun-comment')
export class YangChunComment extends LitElement {
  static styles = yangChunCommentStyles;
  static readonly MAX_NAME_LENGTH: number = 25;
  static readonly MAX_MESSAGE_LENGTH: number = 1000;

  @state() private accessor draft = '';
  @state() private accessor comments: Comment[] = [];

  render() {
    return html`
      <div class="root" part="root">
        <!-- <slot></slot> -->
        <comment-input
          .value=${this.draft}
          @comment-change=${this.onDraftChange}
          @comment-submit=${this.onDraftSubmit}
        ></comment-input>
        <comment-list
          .comments=${this.comments}
          @comment-reply=${this.onReplyToComment}
        ></comment-list>
      </div>
    `;
  }

  private onDraftChange(e: CustomEvent<string>) {
    this.draft = e.detail.slice(0, YangChunComment.MAX_MESSAGE_LENGTH);
  }

  private onDraftSubmit() {
    if (this.draft.trim().length === 0) return;

    const newComment: Comment = {
      id: crypto.randomUUID(),
      msg: this.draft.trim(),
      pubDate: Date.now(),
    };

    this.comments = [...this.comments, newComment];
    this.draft = '';
  }

  private onReplyToComment(e: CustomEvent<string>) {
    console.debug('Reply to comment ID:', e.detail);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'yangchun-comment': YangChunComment;
  }
}
