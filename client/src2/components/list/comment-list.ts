import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { Comment } from '@ziteh/yangchun-comment-shared';
import './comment-list-item';
import { sortCommentsByDate, filterRootComments, findReplyComments } from '../../utils/comment';
import { yangChunCommentStyles } from '../yangchun-comment.styles';
import { t } from '../../utils/i18n';

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
      .no-comments {
        text-align: center;
        color: var(--ycc-text-secondary);
        font-style: italic;
        font-size: 0.9em;
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
    if (this.comments.length === 0) {
      return html`<p class="no-comments">${t('noComments')}</p>`;
    }

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
