import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { Comment } from '@ziteh/yangchun-comment-shared';

@customElement('comment-info')
export class CommentInfo extends LitElement {
  static properties = {
    comment: { type: Object },
    isReply: { type: Boolean },
  };
  comment: Comment | null = null;
  isReply = true; // true: reply, false: edit

  render() {
    return html`
      <div class="info-bar">
        <div class="reference-comment-info">
          ${this.comment
            ? html`${this.isReply
                  ? html`<span>Replying to: ${this.comment.pseudonym}</span>`
                  : html`<span>Editing: ${this.comment.id}</span>`}
                <button>Cancel</button> `
            : html``}
        </div>
        <div>
          <button>RSS</button>
          <button>Help</button>
        </div>
      </div>
    `;
  }
}
