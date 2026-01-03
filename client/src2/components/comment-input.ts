import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

@customElement('comment-input')
export class CommentInput extends LitElement {
  static properties = {
    message: { type: String },
    nickname: { type: String },
  };
  message = '';
  nickname = '';

  @state() private accessor isPreview = false;

  render() {
    return html`
      <textarea
        .value=${this.message}
        @input=${this.onInputMessage}
        placeholder="Write a comment..."
      ></textarea>
      <input
        type="text"
        .value=${this.nickname}
        @input=${this.onInputNickname}
        placeholder="Nickname"
      />
      <button @click=${this.togglePreview}>${this.isPreview ? 'Edit' : 'Preview'}</button>
      <button @click=${this.onSubmit}>Submit</button>
    `;
  }

  private togglePreview() {
    this.isPreview = !this.isPreview;
  }

  private onInputMessage(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    this.dispatchEvent(
      new CustomEvent('comment-change', {
        detail: target.value,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onInputNickname(e: Event) {
    const target = e.target as HTMLInputElement;
    this.dispatchEvent(
      new CustomEvent('nickname-change', {
        detail: target.value,
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
