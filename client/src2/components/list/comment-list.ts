import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { Comment } from '@ziteh/yangchun-comment-shared';
import './comment-list-item';
import { sortCommentsByDate, filterRootComments, findReplyComments } from '../../utils/comment';

@customElement('comment-list')
export class CommentList extends LitElement {
  static properties = {
    comments: { type: Array },
  };
  comments: Comment[] = [];

  // testSubComments: Comment[] = [
  //   {
  //     id: 'sub1',
  //     msg: 'This is a sub-comment.',
  //     pubDate: Date.now(),
  //     replyTo: 'sub0',
  //   },
  //   {
  //     id: 'sub2',
  //     msg: 'This is another sub-comment.',
  //     pubDate: Date.now(),
  //     replyTo: 'sub0',
  //   },
  // ];

  render() {
    return html`
      <div>
        ${sortCommentsByDate(filterRootComments(this.comments), true).map(
          (comment) => html`
            <comment-list-item
              .comment=${comment}
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
