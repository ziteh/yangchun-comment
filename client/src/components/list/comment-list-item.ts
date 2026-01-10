import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { yangChunCommentStyles } from '../yangchun-comment.styles';
import type { Comment } from '@ziteh/yangchun-comment-shared';
import { sanitizeHtml } from '../../utils/sanitize';
import snarkdown from 'snarkdown';
import { formatRelativeDate, formatAbsoluteDate } from '../../utils/format';
import { t } from '../../utils/i18n';

const deletedMark = 'deleted';

@customElement('comment-list-item')
export class CommentListItem extends LitElement {
  static styles = [
    yangChunCommentStyles,
    css`
      :host {
        display: block;
        margin-bottom: var(--ycc-spacing-s);
      }
      .comment-box {
        padding: var(--ycc-spacing-s);
        // border: 1px solid var(--ycc-border-color);
        // border-radius: var(--ycc-radius);
        border: none;
        background-color: var(--ycc-bg-color);
      }
      .reply-comment .comment-box {
        // background-color: var(--ycc-bg-secondary);
      }
      .header {
        display: flex;
        align-items: baseline;
        gap: var(--ycc-spacing-s);
        margin-bottom: var(--ycc-spacing-s);
        font-size: 0.9em;
        color: var(--ycc-text-secondary);
        flex-wrap: wrap;
      }
      .author {
        font-weight: bold;
        color: var(--ycc-text-color);
        font-size: 1.1em;
      }
      .badge {
        background-color: var(--ycc-primary-color);
        color: var(--ycc-bg-color);
        border-radius: var(--ycc-radius);
        padding: 2px var(--ycc-spacing-xs);
        font-size: 0.8em;
      }
      .date-relative {
        font-size: 0.9em;
      }
      .date-absolute {
        display: none;
        font-size: 0.9em;
      }
      .comment-id {
        display: none;
        font-size: 0.9em;
      }
      .header:hover .comment-id {
        display: block;
        opacity: 0.6;
      }
      .header:hover .date-absolute {
        display: block;
        opacity: 0.6;
      }
      .comment-reply-to {
        display: none;
        font-size: 0.9em;
      }
      .header:hover .comment-reply-to {
        display: block;
        opacity: 0.6;
      }
      .content {
        margin: 0;
        line-height: 1.6;
        white-space: pre-wrap;
        word-break: break-word;
        overflow: hidden;
        transition: max-height 0.3s ease-out;
      }
      .content.collapsed {
        max-height: 10em;
        position: relative;
      }
      .content.collapsed::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 3em;
        background: linear-gradient(transparent, var(--ycc-bg-color));
        pointer-events: none;
      }
      .show-more-btn {
        margin-top: var(--ycc-spacing-xs);
        color: var(--ycc-primary-color);
        font-weight: 500;
        cursor: pointer;
        padding: 2px 0;
        font-size: 0.9em;
        background: none;
        border: none;
      }
      .show-more-btn:hover {
        color: var(--ycc-primary-hover);
        text-decoration: underline;
        background: none;
      }
      .content p {
        margin: 0.5em 0;
      }
      .content a {
        color: var(--ycc-primary-color);
        text-decoration: underline;
      }
      .content a:hover {
        color: var(--ycc-primary-hover);
      }
      .content img {
        max-width: 100%;
        height: auto;
        border-radius: var(--ycc-radius);
        display: block;
        margin: var(--ycc-spacing-s) 0;
      }
      .content code {
        background-color: var(--ycc-bg-secondary);
        padding: 2px 4px;
        border-radius: 4px;
        font-family: var(--ycc-font-monospace);
        font-size: 0.9em;
      }
      .content pre {
        background-color: var(--ycc-bg-secondary);
        padding: var(--ycc-spacing-s);
        border-radius: var(--ycc-radius);
        overflow-x: auto;
        margin: var(--ycc-spacing-s) 0;
      }
      .content pre code {
        padding: 0;
        background-color: transparent;
        display: block;
      }
      .content ul,
      .content ol {
        padding-left: var(--ycc-spacing-l);
        margin: var(--ycc-spacing-s) 0;
      }
      .content li {
        margin: 0.2em 0;
      }
      .content hr {
        border: none;
        border-top: 1px solid var(--ycc-border-color);
        margin: var(--ycc-spacing-m) 0;
      }
      .content blockquote {
        border-left: 4px solid var(--ycc-border-color);
        margin: var(--ycc-spacing-s) 0;
        padding-left: var(--ycc-spacing-m);
        color: var(--ycc-text-secondary);
      }
      .content strong {
        font-weight: bold;
      }
      .content em {
        font-style: italic;
      }
      .content h6 {
        font-size: 1em;
        margin: var(--ycc-spacing-s) 0;
        font-weight: bold;
      }
      .actions {
        gap: var(--ycc-spacing-s);
        display: flex;
        margin-top: var(--ycc-spacing-s);
        // justify-content: flex-end;
        opacity: 0.7;
      }
      .reply-comments {
        margin-left: var(--ycc-spacing-l);
        // margin-top: var(--ycc-spacing-s);
        padding-left: var(--ycc-spacing-s);
        border-left: 4px solid var(--ycc-border-color);
      }
    `,
  ];

  @property({ type: Object }) accessor comment: Comment = {
    id: '',
    msg: '',
    pubDate: 0,
  };
  @property({ type: Array }) accessor replyComments: Comment[] = [];
  @property({ type: String }) accessor author = '';
  @property({ type: Function }) accessor canEditCallback: (commentId: string) => boolean = () =>
    false; // TODO: rename
  @property({ type: Function }) accessor isMyCommentCallback: (commentId: string) => boolean = () =>
    false;

  private isContentExpanded = false;
  private readonly MAX_LINES = 10;

  render() {
    const commentContent = html`
      <!-- prettier-ignore -->
      <div
        class="content ${!this.isContentExpanded && this.shouldShowExpandBtn() ? 'collapsed' : ''}"
      >${this.renderMarkdown(this.comment.msg)}</div>
    `;

    return html`
      <div class=${this.comment.replyTo ? 'reply-comment' : 'root-comment'}>
        <div
          class="comment-box"
          id=${this.comment.id}
          role="article"
          aria-labelledby="author-${this.comment.id}"
        >
          <div class="header">
            <span class="author" id="author-${this.comment.id}"
              >${this.comment.isAdmin && this.author
                ? this.author
                : this.comment.pseudonym || t('anonymous')}</span
            >
            ${(() => {
              if (this.comment.isAdmin) {
                return html`<span class="badge">${t('author')}</span>`;
              } else if (this.isMyCommentCallback(this.comment.id)) {
                return html`<span class="badge">${t('me')}</span>`;
              }
              return null;
            })()}
            ${this.comment.modDate && this.comment.modDate > this.comment.pubDate
              ? html`
                  <time
                    class="date-relative"
                    datetime=${new Date(this.comment.modDate).toISOString()}
                    aria-label="${t('edited')} ${formatRelativeDate(
                      this.comment.modDate,
                      t('bcp47'),
                    )} (${formatAbsoluteDate(this.comment.modDate)})"
                  >
                    ${t('edited') + ' ' + formatRelativeDate(this.comment.modDate, t('bcp47'))}
                  </time>
                  <span class="date-absolute" aria-hidden="true"
                    >${formatAbsoluteDate(this.comment.modDate)}</span
                  >
                `
              : html`
                  <time
                    class="date-relative"
                    datetime=${new Date(this.comment.pubDate).toISOString()}
                    aria-label="${formatRelativeDate(
                      this.comment.pubDate,
                      t('bcp47'),
                    )} (${formatAbsoluteDate(this.comment.pubDate)})"
                  >
                    ${formatRelativeDate(this.comment.pubDate, t('bcp47'))}
                  </time>
                  <span class="date-absolute" aria-hidden="true"
                    >${formatAbsoluteDate(this.comment.pubDate)}</span
                  >
                `}
            <span class="comment-id" aria-hidden="true">#${this.comment.id}</span>
            ${this.comment.replyTo
              ? html`<span class="comment-reply-to"
                  >${t('replyTo') + ' #' + this.comment.replyTo}</span
                >`
              : null}
          </div>
          ${commentContent}
          ${this.shouldShowExpandBtn()
            ? html`<button class="show-more-btn" @click=${this.toggleExpand}>
                ${this.isContentExpanded ? t('showLess') : t('showMore')}
              </button>`
            : null}
          ${this.isPreviewComment() ||
          (this.comment.pseudonym === deletedMark && this.comment.msg === deletedMark)
            ? null
            : html`
                <div class="actions">
                  <button
                    class="text-btn"
                    @click=${this.onReply}
                    title=${t('replyTo') + ' #' + this.comment.id}
                    aria-label=${t('replyTo') + ' ' + (this.comment.pseudonym || t('anonymous'))}
                  >
                    ${t('reply')}
                  </button>
                  ${this.canEditCallback(this.comment.id) // TODO: to @state ?
                    ? html`
                        <button class="text-btn" @click=${this.onEdit}>${t('edit')}</button>
                        <button class="text-btn" @click=${this.onDelete}>${t('delete')}</button>
                      `
                    : null}
                </div>
              `}
        </div>

        <div class="reply-comments" role="list">
          ${this.replyComments.map(
            (cmt) => html`
              <comment-list-item
                role="listitem"
                .comment=${cmt}
                .author=${this.author}
                .canEditCallback=${this.canEditCallback}
                .isMyCommentCallback=${this.isMyCommentCallback}
              ></comment-list-item>
            `,
          )}
        </div>
      </div>
    `;
  }

  private isPreviewComment(): boolean {
    const magicString = 'preview_';
    return this.comment.id === magicString;
  }

  private onDelete() {
    if (!this.comment.id) return;
    this.dispatchEvent(
      new CustomEvent('comment-delete', {
        detail: this.comment.id,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onEdit() {
    if (!this.comment.id) return;
    this.dispatchEvent(
      new CustomEvent('comment-edit', {
        detail: this.comment.id,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onReply() {
    if (!this.comment.id) return;
    this.dispatchEvent(
      new CustomEvent('comment-reply', {
        detail: this.comment.id,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private renderMarkdown(raw: string | undefined | null): ReturnType<typeof unsafeHTML> {
    return unsafeHTML(sanitizeHtml(snarkdown(raw || '')));
  }

  private shouldShowExpandBtn(): boolean {
    const lines = (this.comment.msg || '').split('\n');
    return lines.length > this.MAX_LINES;
  }

  private toggleExpand(): void {
    this.isContentExpanded = !this.isContentExpanded;
    this.requestUpdate();
  }
}
