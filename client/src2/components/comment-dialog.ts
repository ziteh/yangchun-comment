import { LitElement, html, css, type PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { yangChunCommentStyles } from './yangchun-comment.styles';
import { t } from '../utils/i18n';

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
        overflow-y: auto;
        max-height: 90vh;
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

  @query('.dialog') private accessor dialogElement!: HTMLDivElement;
  @query('.close-btn') private accessor closeButton!: HTMLButtonElement;

  private previousFocus: HTMLElement | null = null;

  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has('open')) {
      if (this.open) {
        this.previousFocus = (document.activeElement as HTMLElement) || null;
        this.addEventListeners();
        // Wait for render
        setTimeout(() => {
          this.closeButton?.focus();
        }, 0);
      } else {
        this.removeEventListeners();
        if (this.previousFocus && this.previousFocus.isConnected) {
          this.previousFocus.focus();
        }
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListeners();
  }

  private addEventListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
  }

  private removeEventListeners() {
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.open) return;

    if (e.key === 'Escape') {
      this.onClose();
      return;
    }

    if (e.key === 'Tab') {
      this.trapFocus(e);
    }
  };

  private trapFocus(e: KeyboardEvent) {
    if (!this.dialogElement) return;

    const focusableElements = this.dialogElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }

  render() {
    if (!this.open) return null;

    return html`
      <div class="overlay" @click=${this.onOverlayClick}>
        <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
          <button class="close-btn" @click=${this.onClose} aria-label=${t('close')}>&times;</button>
          <h2 id="dialog-title">${this.header}</h2>
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
