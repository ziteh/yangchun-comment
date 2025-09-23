---
title: Security
---

:::caution
These configurations are intentionally strict but can **NOT** cover all potential vulnerabilities.
:::

User comments are untrusted input and must always be treated as unsafe to prevent XSS (Cross-Site Scripting) attacks.

Currently, sanitization is performed on both the frontend and the backend.

- **Frontend:** [DOMPurify](https://github.com/cure53/DOMPurify)
- **Backend:** [sanitize-html](https://github.com/apostrophecms/sanitize-html)

## DOMPurify

- Uses a whitelist of safe tags and attributes.
- Adds `target="_blank"` and `rel="noopener noreferrer"` to all `<a>` links.
- Adds `loading="lazy"` to all `<img>` elements (performance optimization).
- Allows only `http:` and `https:` URLs, removing unsafe protocols (e.g. `javascript:`).

[source code](https://github.com/ziteh/yangchun-comment/blob/main/client/src/utils/sanitize.ts)

```ts
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
```

## sanitize-html

- Strips all HTML, leaving only plain Markdown.

[source code](https://github.com/ziteh/yangchun-comment/blob/main/server/src/utils.ts)

```ts
export function sanitize(raw: unknown): string {
  if (typeof raw !== 'string') return '';

  const htmlRemoved = sanitizeHtml(raw, {
    allowedTags: [], // no tags allowed
    allowedAttributes: {}, // no attributes allowed
    disallowedTagsMode: 'discard', // or 'completelyDiscard'
    parser: {
      // If set to true, entities within the document will be decoded. Defaults to true.
      // It is recommended to never disable the 'decodeEntities' option
      decodeEntities: true,
      lowerCaseTags: true,
    },
  });

  return htmlRemoved;
}
```

## Notes

- DOMPurify already provides strong protection against XSS, sanitize-html is primarily a secondary layer, removing all HTML for storage cleanliness.
- Vulnerabilities can **NOT** be completely eliminated. We must consider the difficulty of an attack and the severity of its consequences, striking a balance between the cost of defense and the value of potential losses.
