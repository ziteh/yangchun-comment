import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { yangChunCommentStyles } from '../yangchun-comment.styles';
import type { Comment } from '@ziteh/yangchun-comment-shared';

@customElement('comment-list-item')
export class CommentListItem extends LitElement {
  static styles = [
    yangChunCommentStyles,
    css`
      :host {
        display: block;
        margin-bottom: var(--ycc-spacing-s);
      }
      .comment-box {
        padding: var(--ycc-spacing-s);
        // border: 1px solid var(--ycc-border-color);
        // border-radius: var(--ycc-radius);
        border: none;
        background-color: var(--ycc-bg-color);
      }
      .reply-comment .comment-box {
        // background-color: var(--ycc-bg-secondary);
      }
      .header {
        display: flex;
        align-items: baseline;
        gap: var(--ycc-spacing-s);
        margin-bottom: var(--ycc-spacing-s);
        font-size: 0.9em;
        color: var(--ycc-text-secondary);
      }
      .author {
        font-weight: bold;
        color: var(--ycc-text-color);
        font-size: 1.1em;
      }
      .badge {
        background-color: var(--ycc-primary-color);
        color: var(--ycc-bg-color);
        border-radius: var(--ycc-radius);
        padding: 2px var(--ycc-spacing-xs);
        font-size: 0.8em;
      }
      .date {
        // font-style: italic;
      }
      .content {
        margin: 0;
        line-height: 1.6;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .actions {
        gap: var(--ycc-spacing-s);
        display: flex;
        justify-content: flex-end;
      }
      .reply-comments {
        margin-left: var(--ycc-spacing-l);
        // margin-top: var(--ycc-spacing-s);
        padding-left: var(--ycc-spacing-s);
        border-left: 4px solid var(--ycc-border-color);
      }
    `,
  ];

  static properties = {
    comment: { type: Object },
    replyComments: { type: Array },
    badge: { type: String },
  };
  comment: Comment = {
    id: '',
    msg: '',
    pubDate: 0,
  };
  replyComments: Comment[] = [];
  badge: 'author' | 'me' | '' = 'author'; // TODO: default

  render() {
    return html`
      <div class=${this.comment.replyTo ? 'reply-comment' : 'root-comment'}>
        <div class="comment-box" id=${this.comment.id}>
          <div class="header">
            <span class="author">${this.comment.pseudonym ?? '?'}</span>
            ${this.badge
              ? html`<span class="badge">${this.badge === 'author' ? 'Author' : 'Me'}</span>`
              : null}
            <span class="date">${new Date(this.comment.pubDate).toLocaleString()}</span>
          </div>
          <p class="content">${this.comment.msg ?? ''}</p>
          ${this.isPreviewComment()
            ? null
            : html`
                <div class="actions">
                  <button class="text-btn">Delete</button>
                  <button class="text-btn">Edit</button>
                  <button class="text-btn" @click=${this.onReply}>Reply</button>
                </div>
              `}
        </div>

        <div class="reply-comments">
          ${this.replyComments.map(
            (cmt) => html` <comment-list-item .comment=${cmt}></comment-list-item> `,
          )}
        </div>
      </div>
    `;
  }

  private isPreviewComment(): boolean {
    const magicString = '_PREVIEW';
    return this.comment.id === magicString && this.comment.nameHash === magicString;
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
