import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { Comment } from '@ziteh/yangchun-comment-shared';
import './comment-list-item';
import { sortCommentsByDate, filterRootComments, findReplyComments } from '../../utils/comment';
import { yangChunCommentStyles } from '../yangchun-comment.styles';

@customElement('comment-list')
export class CommentList extends LitElement {
  static styles = [
    yangChunCommentStyles,
    css`
      :host {
        display: block;
      }
      .reply-comments-container {
        margin-bottom: var(--ycc-spacing-m);
      }
    `,
  ];

  static properties = {
    comments: { type: Array },
    canEditCallback: { type: Function },
  };
  comments: Comment[] = [];
  canEditCallback: (commentId: string) => boolean = () => false;

  render() {
    return html`
      <div class="reply-comments-container">
        ${sortCommentsByDate(filterRootComments(this.comments), true).map(
          (comment) => html`
            <comment-list-item
              .comment=${comment}
              .canEditCallback=${this.canEditCallback}
              .replyComments=${sortCommentsByDate(
                findReplyComments(this.comments, comment.id),
                false,
              )}
            ></comment-list-item>
          `,
        )}
      </div>
    `;
  }
}
