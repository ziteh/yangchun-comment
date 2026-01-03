import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

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

  render() {
    return html`
      ${this.isPreview
        ? html`<div>${this.message}</div>`
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
    `;
  }

  private isValidComment(): boolean {
    const msgLength = this.message.trim().length;
    const nicknameLength = this.nickname.trim().length;

    const isValidMessage = msgLength > 0 && msgLength <= CommentInput.MAX_MESSAGE_LENGTH;
    const isValidNickname = nicknameLength <= CommentInput.MAX_NICKNAME_LENGTH;
    return isValidMessage && isValidNickname;
  }

  private togglePreview() {
    this.isPreview = !this.isPreview;
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
