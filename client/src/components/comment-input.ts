import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { yangChunCommentStyles } from './yangchun-comment.styles';
import './list/comment-list-item';
import { generatePseudonymAndHash } from '../utils/pseudonym';
import type { Comment } from '@ziteh/yangchun-comment-shared';
import { t } from '../utils/i18n';

@customElement('comment-input')
export class CommentInput extends LitElement {
  static shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static styles = [
    yangChunCommentStyles,
    css`
      :host {
        display: block;
        // margin-bottom: var(--ycc-spacing-m);
      }
      .comment-input-container {
        // border: 1px solid var(--ycc-border-color);
        // border-radius: var(--ycc-radius);
        // padding: var(--ycc-spacing-s);
        // background-color: var(--ycc-bg-color);
      }
      .draft-container {
        display: flex;
        flex-direction: column;
        gap: var(--ycc-spacing-s);
        padding: var(--ycc-spacing-s);
      }
      textarea {
        // margin: var(--ycc-spacing-s);
        min-height: 100px;
        resize: vertical;
        border: none;
        resize: none;
        scrollbar-width: thin;
        scrollbar-color: var(--ycc-border-color) transparent;
      }
      textarea::-webkit-scrollbar {
        width: 6px;
      }
      textarea::-webkit-scrollbar-track {
        background: transparent;
      }
      textarea::-webkit-scrollbar-thumb {
        background-color: var(--ycc-border-color);
        border-radius: 3px;
      }
      textarea::-webkit-scrollbar-thumb:hover {
        background-color: var(--ycc-text-secondary);
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--ycc-spacing-s);
      }
      .message-row {
        border: 1px solid var(--ycc-border-color);
        border-bottom: none;
        border-radius: var(--ycc-radius) var(--ycc-radius) 0 0;
        min-height: calc(100px + 2 * var(--ycc-spacing-s));
      }
      .controls-row {
        border: 1px solid var(--ycc-border-color);
        border-radius: 0 0 var(--ycc-radius) var(--ycc-radius);
        display: flex;
        justify-content: space-between;
        gap: var(--ycc-spacing-s);
        padding: var(--ycc-spacing-s);
      }
      .nickname-input {
        flex: 1;
        border: none;
        outline: none;
        // max-width: 250px;
      }
      .preview-container {
        padding: var(--ycc-spacing-s);
        comment-list-item {
          // margin: 0;
        }
      }
      .nickname-wrapper {
        flex: 1;
        display: flex;
        align-items: center;
        gap: var(--ycc-spacing-s);
      }
      .char-counter {
        font-size: 0.75rem;
        color: var(--ycc-text-secondary);
        white-space: nowrap;
      }
      .message-counter {
        text-align: right;
      }
      .input-email {
        position: absolute;
        left: -9999px;
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: none;
        tab-index: -1;
      }
    `,
  ];

  static readonly MAX_NICKNAME_LENGTH: number = 25;
  static readonly MAX_MESSAGE_LENGTH: number = 1000;
  @property({ type: String }) accessor message = '';
  @property({ type: String }) accessor nickname = '';
  @property({ type: String }) accessor editPseudonym = '';

  @state() private accessor isPreview = false;
  @state() private accessor previewComment: Comment | null = null;
  @state() private accessor honeypot = '';

  render() {
    return html`
      <div class="comment-input-container">
        <div class="message-row">
          ${this.isPreview && this.previewComment
            ? html`<div class="preview-container">
                <comment-list-item .comment=${this.previewComment}></comment-list-item>
              </div>`
            : html`<div class="draft-container">
                <textarea
                  .value=${this.message}
                  @input=${this.onInputMessage}
                  placeholder=${t('messagePlaceholder')}
                  aria-label=${t('messagePlaceholder')}
                  aria-describedby="message-counter"
                  maxlength=${CommentInput.MAX_MESSAGE_LENGTH}
                ></textarea>
                <div class="char-counter message-counter" id="message-counter" aria-live="polite">
                  ${this.message.length}/${CommentInput.MAX_MESSAGE_LENGTH}
                </div>
                <input
                  type="email"
                  name="email"
                  class="input-email"
                  .value=${this.honeypot}
                  @input=${this.onHoneypotInput}
                  tabindex="-1"
                  aria-hidden="true"
                  autocomplete="off"
                />
              </div>`}
        </div>

        <div class="controls-row">
          <div class="nickname-wrapper">
            <input
              class="nickname-input"
              .value=${this.nickname}
              @input=${this.onInputNickname}
              type="text"
              placeholder=${t('nicknamePlaceholder')}
              aria-label=${t('nicknamePlaceholder')}
              aria-describedby="nickname-counter"
              ?disabled=${this.isPreview}
              maxlength=${CommentInput.MAX_NICKNAME_LENGTH}
            />
            <span class="char-counter" id="nickname-counter" aria-live="polite">
              ${this.nickname.length}/${CommentInput.MAX_NICKNAME_LENGTH}
            </span>
          </div>
          <div class="actions">
            <button
              class="secondary"
              @click=${this.togglePreview}
              ?disabled=${!this.isValidComment()}
            >
              ${this.isPreview ? t('edit') : t('preview')}
            </button>
            <button @click=${this.onSubmit} ?disabled=${!this.isValidComment()}>
              ${t('submit')}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private async createPreviewComment() {
    const magicString = 'preview_';

    let pseudonym: string;
    if (this.editPseudonym) {
      pseudonym = this.editPseudonym;
    } else if (this.nickname.trim()) {
      const res = await generatePseudonymAndHash(this.nickname);
      pseudonym = res.pseudonym;
    } else {
      pseudonym = t('anonymous');
    }

    return {
      msg: this.message,
      pseudonym,
      pubDate: Date.now(),
      id: magicString,
    };
  }

  private isValidComment(): boolean {
    const msgLength = this.message.trim().length;
    const nicknameLength = this.nickname.trim().length;

    const isValidMessage = msgLength > 0 && msgLength <= CommentInput.MAX_MESSAGE_LENGTH;
    const isValidNickname = nicknameLength <= CommentInput.MAX_NICKNAME_LENGTH;
    return isValidMessage && isValidNickname;
  }

  private async togglePreview() {
    this.isPreview = !this.isPreview;
    if (this.isPreview) {
      this.previewComment = await this.createPreviewComment();
    }
  }

  private onInputMessage(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    this.message = target.value.slice(0, CommentInput.MAX_MESSAGE_LENGTH);
    this.dispatchEvent(
      new CustomEvent('comment-change', {
        detail: this.message,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onInputNickname(e: Event) {
    const target = e.target as HTMLInputElement;
    this.nickname = target.value.slice(0, CommentInput.MAX_NICKNAME_LENGTH);
    this.dispatchEvent(
      new CustomEvent('nickname-change', {
        detail: this.nickname,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onHoneypotInput(e: Event) {
    const target = e.target as HTMLInputElement;
    this.honeypot = target.value;
  }

  private onSubmit() {
    if (this.honeypot !== '') {
      return;
    }

    // back to edit mode
    this.isPreview = false;
    this.previewComment = null;

    this.dispatchEvent(
      new CustomEvent('comment-submit', {
        bubbles: true,
        composed: true,
      }),
    );
  }
}
