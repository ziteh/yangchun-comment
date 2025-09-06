import type { I18nStrings } from './utils/i18n';
import { YangchunCommentElement } from './element';

export function initYangchunComment(
  elementId = 'ycc-app',
  options: {
    post?: string;
    apiUrl?: string;
    language?: 'en' | 'zh-Hant' | I18nStrings;
    authorName?: string;
  } = {},
) {
  const host = document.getElementById(elementId);
  if (!host) throw new Error(`Container #${elementId} not found`);

  const el = document.createElement('yangchun-comment') as unknown as YangchunCommentElement;
  if (options.post) el.post = options.post;
  if (options.apiUrl) el.apiUrl = options.apiUrl;
  if (options.authorName) el.authorName = options.authorName;
  if (options.language) el.language = options.language as 'en' | 'zh-Hant' | I18nStrings;
  host.innerHTML = '';
  host.appendChild(el);
  return el;
}

// Define custom element if not already defined (avoid double-define in HMR/dev)
if (!customElements.get('yangchun-comment')) {
  customElements.define('yangchun-comment', YangchunCommentElement);
}

export default initYangchunComment;
