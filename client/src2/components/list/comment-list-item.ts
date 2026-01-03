import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { yangChunCommentStyles } from '../yangchun-comment.styles';
import type { Comment } from '@ziteh/yangchun-comment-shared';

@customElement('comment-list-item')
export class CommentListItem extends LitElement {
  static styles = yangChunCommentStyles;

  static properties = {
    comment: { type: Object },
    replyComments: { type: Array },
  };
  comment: Comment = {
    id: '',
    msg: '',
    pubDate: 0,
  };
  replyComments: Comment[] = [];

  render() {
    return html`
      <div>
        <div class=${this.comment.replyTo ? 'reply-comment' : 'root-comment'}>
          <strong>${this.comment.pseudonym ?? '?'}</strong>
          <span> at ${new Date(this.comment.pubDate).toLocaleString()}</span>
          <p>${this.comment.msg ?? ''}</p>
          <button @click=${this.onReply}>Reply</button>
        </div>

        <div class="reply-comments">
          ${this.replyComments.map(
            (cmt) => html`
              <comment-list-item .comment=${cmt} @comment-reply=${this.onReply}></comment-list-item>
            `,
          )}
        </div>
      </div>
    `;
  }

  private onReply() {
    // TODO: check replyComments event path, double shooting?
    if (!this.comment.id) return;

    this.dispatchEvent(
      new CustomEvent('comment-reply', {
        detail: this.comment.id,
        bubbles: true,
        composed: true,
      }),
    );
  }
}
