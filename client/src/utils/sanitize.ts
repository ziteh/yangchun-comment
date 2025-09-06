import DOMPurify, { type Config as DomPurifyConfig } from 'dompurify';

export const DOMPURIFY_CONFIG: DomPurifyConfig = {
  ALLOWED_TAGS: [
    'a',
    'b',
    'i',
    'em',
    'strong',
    's',
    'p',
    'ul',
    'ol',
    'li',
    'code',
    'pre',
    'blockquote',
    'h6', // only H6
    'hr',
    'br',
    'img',
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt'],
  ALLOW_DATA_ATTR: false, // disable data-* attributes
  ALLOW_ARIA_ATTR: false, // disable aria-* attributes

  // Explicitly blocklist
  // FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'form', 'embed'],
  // FORBID_ATTR: ['style', 'onclick', 'onmouseover', 'onload', 'onunload', 'onerror'],
};

export function setupDOMPurifyHooks() {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // Make all links open in a new tab, and prevent window.opener vulnerability
    if ((node as Element).tagName === 'A') {
      (node as Element).setAttribute('rel', 'noopener noreferrer');
      (node as Element).setAttribute('target', '_blank');
    }

    // Optimize image loading
    if ((node as Element).tagName === 'IMG') {
      (node as Element).setAttribute('loading', 'lazy');
    }
  });

  DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
    // Only allow http: and https: for href/src attributes
    // Remove javascript: and other potentially dangerous protocols
    if (data.attrName === 'href' || data.attrName === 'src') {
      try {
        const url = new URL(data.attrValue || '');
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          data.keepAttr = false;
        }
      } catch {
        data.keepAttr = false;
      }
    }
  });
}

export function sanitizeHtml(html: string) {
  return DOMPurify.sanitize(html, DOMPURIFY_CONFIG);
}
