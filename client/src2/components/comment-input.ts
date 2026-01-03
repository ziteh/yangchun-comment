import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('comment-input')
export class CommentInput extends LitElement {
  static properties = {
    value: { type: String },
  };

  value = '';

  render() {
    return html`
      <textarea .value=${this.value} @input=${this.onInput}></textarea>
      <button @click=${this.onSubmit}>送出</button>
    `;
  }

  private onInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    this.dispatchEvent(
      new CustomEvent('comment-change', {
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
