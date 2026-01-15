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
    'h6',
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

let isHookInitialized = false;
function initializeHooks() {
  if (isHookInitialized) return;

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // <a> Mark as external link and remove default behavior
    if (node instanceof HTMLAnchorElement) {
      node.setAttribute('rel', 'noopener noreferrer');
      node.setAttribute('data-external-link', 'true');
      // Store original href and remove it to prevent default navigation
      const href = node.getAttribute('href');
      if (href) {
        node.setAttribute('data-href', href);
        node.removeAttribute('href');
      }
      // Add visual indication that it's a link
      node.style.cursor = 'pointer';
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

  isHookInitialized = true;
}

export function sanitizeHtml(dirtyHtml: string): string {
  return DOMPurify.sanitize(dirtyHtml, DOMPURIFY_CONFIG);
}

// Initialize immediately when module is loaded
initializeHooks();
