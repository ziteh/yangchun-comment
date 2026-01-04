import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { yangChunCommentStyles } from './yangchun-comment.styles';

@customElement('comment-dialog')
export class CommentDialog extends LitElement {
  static styles = [
    yangChunCommentStyles,
    css`
      :host {
        display: contents;
      }
      .overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      }
      .dialog {
        color: var(--ycc-text-color);
        background: var(--ycc-bg-color);
        padding: var(--ycc-spacing-m);
        border-radius: var(--ycc-radius);
        max-width: 500px;
        width: 90%;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        position: relative;
      }
      .close-btn {
        position: absolute;
        top: var(--ycc-spacing-s);
        right: var(--ycc-spacing-s);
        background: none;
        color: var(--ycc-text-secondary);
        border: none;
        cursor: pointer;
        font-size: 1.2em;
      }
      .close-btn:hover {
        color: var(--ycc-text-color);
        background: var(--ycc-bg-secondary);
      }
      h2 {
        margin-top: 0;
        margin-bottom: var(--ycc-spacing-m);
      }
    `,
  ];

  @property({ type: Boolean }) accessor open = false;
  @property({ type: String }) accessor header = '';

  render() {
    if (!this.open) return null;

    return html`
      <div class="overlay" @click=${this.onOverlayClick}>
        <div class="dialog">
          <button class="close-btn" @click=${this.onClose}>&times;</button>
          <h2>${this.header}</h2>
          <slot></slot>
        </div>
      </div>
    `;
  }

  private onClose() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  private onOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      this.onClose();
    }
  }
}
