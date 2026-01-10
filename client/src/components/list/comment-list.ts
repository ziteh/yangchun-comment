import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
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

  @property({ type: Array }) accessor comments: Comment[] = [];
  @property({ type: String }) accessor author = '';
  @property({ type: Function }) accessor canEditCallback: (commentId: string) => boolean = () =>
    false; // TODO: to global
  @property({ type: Function }) accessor isMyCommentCallback: (commentId: string) => boolean = () =>
    false; // TODO: to global

  render() {
    if (this.comments.length === 0) {
      return html`<p class="no-comments">${t('noComments')}</p>`;
    }

    return html`
      <div class="reply-comments-container" role="list">
        ${sortCommentsByDate(filterRootComments(this.comments), true).map(
          (comment) => html`
            <comment-list-item
              role="listitem"
              .comment=${comment}
              .author=${this.author}
              .canEditCallback=${this.canEditCallback}
              .isMyCommentCallback=${this.isMyCommentCallback}
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
