import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { yangChunCommentStyles } from './yangchun-comment.styles';
import type { Comment } from '@ziteh/yangchun-comment-shared';

@customElement('comment-info')
export class CommentInfo extends LitElement {
  static styles = [
    yangChunCommentStyles,
    css`
      :host {
        display: block;
      }
      .info-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--ycc-spacing-s);
        // background-color: var(--ycc-bg-secondary);
        // border-radius: var(--ycc-radius);
        // margin-bottom: var(--ycc-spacing-s);
        font-size: 0.9em;
      }
      .reference-comment-info {
        display: flex;
        align-items: center;
        gap: var(--ycc-spacing-s);
      }
      .actions {
        display: flex;
        gap: var(--ycc-spacing-s);
      }
    `,
  ];

  static properties = {
    comment: { type: Object },
    isReply: { type: Boolean },
  };
  comment: Comment | null = null;
  isReply = true; // true: reply, false: edit

  render() {
    if (!this.comment) {
      return html`
        <div class="info-bar">
          <!-- TODO: refactor this -->
          <div></div>
          <div class="actions">
            <button class="text-btn">Notify</button>
            <button class="text-btn" @click=${this.onHelp}>Help</button>
          </div>
        </div>
      `;
    }

    return html`
      <div class="info-bar">
        <div class="reference-comment-info">
          ${this.isReply
            ? html`<span>Replying to: <strong>${this.comment.pseudonym}</strong></span>`
            : html`<span>Editing: <strong>${this.comment.id}</strong></span>`}
          <button class="text-btn" @click=${this.onCancel}>Cancel</button>
        </div>
        <div class="actions">
          <button class="text-btn">Notify</button>
          <button class="text-btn" @click=${this.onHelp}>Help</button>
        </div>
      </div>
    `;
  }

  private onHelp() {
    this.dispatchEvent(
      new CustomEvent('help-request', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onCancel() {
    if (!this.comment?.id) return;

    this.dispatchEvent(
      new CustomEvent('reference-comment-cancel', {
        detail: this.comment.id,
        bubbles: true,
        composed: true,
      }),
    );
  }
}
