import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('comment-list')
export class CommentList extends LitElement {
  static properties = {
    value: { type: Array },
  };
  value: string[] = [];

  render() {
    return html`${this.value.map((comment) => html`<p>${comment}</p>`)}`;
  }
}
