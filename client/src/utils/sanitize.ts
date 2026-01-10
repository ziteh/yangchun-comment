import DOMPurify, { type Config as DomPurifyConfig } from 'dompurify';

const DOMPURIFY_CONFIG: DomPurifyConfig = {
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

let isHookSetup = false; // TODO: is this necessary?

function initializeHooks() {
  if (isHookSetup) return;

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // <a> Make all links open in a new tab, and prevent window.opener vulnerability
    if (node instanceof HTMLAnchorElement) {
      node.setAttribute('rel', 'noopener noreferrer');
      node.setAttribute('target', '_blank');
    }

    // <img> Optimize image loading
    if (node instanceof HTMLImageElement) {
      node.setAttribute('loading', 'lazy');
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

  isHookSetup = true;
}

// Initialize immediately when module is loaded
initializeHooks();

export function sanitizeHtml(dirtyHtml: string) {
  return DOMPurify.sanitize(dirtyHtml, DOMPURIFY_CONFIG);
}
