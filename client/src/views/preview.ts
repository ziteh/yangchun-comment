import { html, type TemplateResult } from 'lit';
import type { YangchunCommentElement } from '../element';
import { formatDate } from '../utils/format';

export function createPreviewTemplate(ctx: YangchunCommentElement): TemplateResult {
  const now = Date.now();
  const userName = ctx.previewPseudonym$ ?? '';
  return html` <div class="comment-box preview-mode">
    <div id="preview">
      ${ctx.previewText$
        ? html` <div class="preview-comment">
            <div class="comment-header">
              <span class="comment-name">${userName || ctx.i18n$.t('anonymous')}</span>
              <span class="comment-time">${formatDate(now)}</span>
              ${ctx.currentReplyTo$ && ctx.commentMap$[ctx.currentReplyTo$]
                ? html`<span class="reply-to"
                    >${ctx.i18n$.t('replyTo')}<span
                      >${ctx.getDisplayName(ctx.commentMap$[ctx.currentReplyTo$])}</span
                    ></span
                  >`
                : ''}
            </div>
            <div class="comment-content">${ctx.renderMarkdown(ctx.previewText$)}</div>
          </div>`
        : html`<div class="empty-preview">${ctx.i18n$.t('emptyPreview')}</div>`}
    </div>
    <div class="comment-footer ycc-flex ycc-gap-xs">
      <span style="flex: 1;"></span>
      <div class="ycc-flex ycc-gap-xs">
        <button
          type="button"
          class="help-btn ycc-clickable ycc-reset-button"
          title="${ctx.i18n$.t('markdownHelp')}"
          @click=${() => ctx.toggleMarkdownHelp()}
        >
          ?
        </button>
        <button
          type="button"
          class="preview-btn ycc-clickable ycc-transition ycc-transparent-bg active ycc-reset-button"
          @click=${() => ctx.switchTab('write')}
        >
          ${ctx.i18n$.t('write')}
        </button>
        <button
          type="button"
          class="submit-btn ycc-clickable ycc-transition ycc-reset-button"
          @click=${() => ctx.handlePreviewSubmit()}
        >
          ${ctx.editingComment$ ? ctx.i18n$.t('updateComment') : ctx.i18n$.t('submitComment')}
        </button>
      </div>
    </div>
  </div>`;
}
