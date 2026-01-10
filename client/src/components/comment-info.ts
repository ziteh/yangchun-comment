import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { yangChunCommentStyles } from './yangchun-comment.styles';
import type { Comment } from '@ziteh/yangchun-comment-shared';
import { t } from '../utils/i18n';

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
      .admin-btn {
        opacity: 0;
        transition: opacity 0.2s;
      }
      .admin-btn:hover {
        opacity: 1;
      }
      .info-bar.error {
        justify-content: flex-start;
        gap: var(--ycc-spacing-s);
      }
      .error-msg {
        color: var(--ycc-error-color, #ff4d4f);
      }
    `,
  ];

  @property({ type: Object }) accessor comment: Comment | null = null;
  @property({ type: Boolean }) accessor isReply = true; // true: reply, false: edit
  @property({ type: String }) accessor errorMessage = '';

  render() {
    if (this.errorMessage) {
      return html`
        <div class="info-bar error">
          <span class="error-msg">${this.errorMessage}</span>
          <button class="text-btn" @click=${this.handleErrorClear}>${t('close')}</button>
        </div>
      `;
    }

    if (!this.comment) {
      return html`
        <div class="info-bar">
          <!-- TODO: refactor this -->
          <div></div>
          <div class="actions">
            <button class="text-btn admin-btn" @click=${this.handleAdmin}>Admin</button>
            <button class="text-btn" @click=${this.handleNotify}>${t('notify')}</button>
            <button class="text-btn" @click=${this.handleHelp}>${t('help')}</button>
          </div>
        </div>
      `;
    }

    return html`
      <div class="info-bar">
        <div class="reference-comment-info">
          ${this.isReply
            ? html`<span
                >${t('replyingTo')}<strong
                  >${this.comment.pseudonym || t('anonymous')}${' #' + this.comment.id}</strong
                ></span
              >`
            : html`<span>${t('editing')}<strong>${this.comment.id}</strong></span>`}
          <button class="text-btn" @click=${this.handleCancel}>${t('cancel')}</button>
        </div>
        <div class="actions">
          <button class="text-btn admin-btn" @click=${this.handleAdmin}>Admin</button>
          <button class="text-btn" @click=${this.handleNotify}>${t('notify')}</button>
          <button class="text-btn" @click=${this.handleHelp}>${t('help')}</button>
        </div>
      </div>
    `;
  }

  private handleAdmin() {
    this.dispatchEvent(
      new CustomEvent('admin-open', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleHelp() {
    this.dispatchEvent(
      new CustomEvent('help-open', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleNotify() {
    this.dispatchEvent(
      new CustomEvent('notify-open', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleErrorClear() {
    this.dispatchEvent(
      new CustomEvent('error-clear', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleCancel() {
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
