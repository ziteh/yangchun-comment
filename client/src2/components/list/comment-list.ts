import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { Comment } from '@ziteh/yangchun-comment-shared';
import './comment-list-item';

@customElement('comment-list')
export class CommentList extends LitElement {
  static properties = {
    comments: { type: Array },
  };
  comments: Comment[] = [];

  render() {
    return html`
      <div>
        ${this.comments.map(
          (comment) => html`
            <comment-list-item
              .comment=${comment}
              @comment-reply=${this.onReply}
            ></comment-list-item>
          `,
        )}
      </div>
    `;
  }

  private onReply(e: CustomEvent<string>) {
    const replyToId = e.detail;
    this.dispatchEvent(
      new CustomEvent('comment-reply', {
        detail: replyToId,
        bubbles: true,
        composed: true,
      }),
    );
  }
}
