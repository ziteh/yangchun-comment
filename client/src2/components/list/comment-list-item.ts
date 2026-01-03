import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { Comment } from '@ziteh/yangchun-comment-shared';

@customElement('comment-list-item')
export class CommentListItem extends LitElement {
  static properties = {
    comment: { type: Object },
  };
  comment: Comment = {
    id: '',
    msg: '',
    pubDate: 0,
  };

  render() {
    return html`
      <div>
        <strong>${this.comment.pseudonym ?? '?'}</strong>
        <span> at ${new Date(this.comment.pubDate).toLocaleString()}</span>
        <p>${this.comment.msg ?? ''}</p>
        <button @click=${this.onReply}>Reply</button>
      </div>
    `;
  }

  private onReply() {
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
