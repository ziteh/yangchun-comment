import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import './list/comment-list-item';
import { generatePseudonymAndHash } from '../utils/pseudonym';
import type { Comment } from '@ziteh/yangchun-comment-shared';

@customElement('comment-input')
export class CommentInput extends LitElement {
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
      <div>
        ${this.isPreview && this.previewComment
          ? html`<div>
              <comment-list-item .comment=${this.previewComment}></comment-list-item>
            </div>`
          : html`<div>
              <textarea
                .value=${this.message}
                @input=${this.onInputMessage}
                placeholder="Write a comment..."
              ></textarea>
              <input
                .value=${this.nickname}
                @input=${this.onInputNickname}
                type="text"
                placeholder="Nickname"
              />
            </div>`}

        <button @click=${this.togglePreview} ?disabled=${!this.isValidComment()}>
          ${this.isPreview ? 'Edit' : 'Preview'}
        </button>
        <button @click=${this.onSubmit} ?disabled=${!this.isValidComment()}>Submit</button>
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
