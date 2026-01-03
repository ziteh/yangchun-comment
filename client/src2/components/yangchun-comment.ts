import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { yangChunCommentStyles } from './yangchun-comment.styles';

@customElement('yangchun-comment')
export class YangChunComment extends LitElement {
  static styles = yangChunCommentStyles;

  render() {
    return html`
      <div class="root" part="root">
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'yangchun-comment': YangChunComment;
  }
}
