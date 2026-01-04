import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { yangChunCommentStyles } from './yangchun-comment.styles';
import './list/comment-list-item';
import { generatePseudonymAndHash } from '../utils/pseudonym';
import type { Comment } from '@ziteh/yangchun-comment-shared';

@customElement('comment-input')
export class CommentInput extends LitElement {
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
    `,
  ];

  static readonly MAX_NICKNAME_LENGTH: number = 25;
  static readonly MAX_MESSAGE_LENGTH: number = 1000;
  static properties = {
    message: { type: String },
    nickname: { type: String },
  };
  message = '';
  nickname = '';

  @state() private accessor isPreview = false;
  @state() private accessor previewComment: Comment | null = null;

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
                  placeholder="Write a comment..."
                ></textarea>
              </div>`}
        </div>

        <div class="controls-row">
          <input
            class="nickname-input"
            .value=${this.nickname}
            @input=${this.onInputNickname}
            type="text"
            placeholder="Nickname"
            ?disabled=${this.isPreview}
          />
          <div class="actions">
            <button
              class="secondary"
              @click=${this.togglePreview}
              ?disabled=${!this.isValidComment()}
            >
              ${this.isPreview ? 'Edit' : 'Preview'}
            </button>
            <button @click=${this.onSubmit} ?disabled=${!this.isValidComment()}>Submit</button>
          </div>
        </div>
      </div>
    `;
  }

  private async createPreviewComment() {
    const magicString = '_PREVIEW';
    const { pseudonym } = await generatePseudonymAndHash(this.nickname);
    return {
      msg: this.message,
      pseudonym: pseudonym,
      pubDate: Date.now(),
      id: magicString,
      nameHash: magicString,
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
    this.dispatchEvent(
      new CustomEvent('comment-change', {
        detail: target.value.slice(0, CommentInput.MAX_MESSAGE_LENGTH),
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onInputNickname(e: Event) {
    const target = e.target as HTMLInputElement;
    this.dispatchEvent(
      new CustomEvent('nickname-change', {
        detail: target.value.slice(0, CommentInput.MAX_NICKNAME_LENGTH),
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onSubmit() {
    this.dispatchEvent(
      new CustomEvent('comment-submit', {
        bubbles: true,
        composed: true,
      }),
    );
  }
}
