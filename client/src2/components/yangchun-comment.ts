import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { yangChunCommentStyles } from './yangchun-comment.styles';
import type { Comment } from '@ziteh/yangchun-comment-shared';
import './comment-input';
import './list/comment-list';

@customElement('yangchun-comment')
export class YangChunComment extends LitElement {
  static styles = yangChunCommentStyles;

  @state() private accessor draft = '';
  @state() private accessor nickname = '';
  @state() private accessor comments: Comment[] = [];

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
        <comment-list
          .comments=${this.comments}
          @comment-reply=${this.onReplyToComment}
        ></comment-list>
      </div>
    `;
  }

  private onDraftChange(e: CustomEvent<string>) {
    this.draft = e.detail.trim();
  }

  private onNicknameChange(e: CustomEvent<string>) {
    this.nickname = e.detail.trim();
  }

  private onDraftSubmit() {
    if (this.draft.trim().length === 0) return;

    const newComment: Comment = {
      id: crypto.randomUUID(),
      msg: this.draft.trim(),
      pseudonym: this.nickname,
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
