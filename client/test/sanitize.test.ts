import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../src/utils/sanitize';

describe('HTML Sanitize', () => {
  describe('Basic HTML tag filtering', () => {
    it('should allow basic formatting tags', () => {
      const input = '<b>bold</b> <i>italic</i> <strong>strong</strong> <em>emphasis</em>';
      const output = sanitizeHtml(input);
      expect(output).toContain('<b>bold</b>');
      expect(output).toContain('<i>italic</i>');
      expect(output).toContain('<strong>strong</strong>');
      expect(output).toContain('<em>emphasis</em>');
    });

    it('should allow list tags', () => {
      const input = '<ul><li>item 1</li><li>item 2</li></ul>';
      const output = sanitizeHtml(input);
      expect(output).toContain('<ul>');
      expect(output).toContain('<li>');
    });

    it('should allow code and pre tags', () => {
      const input = '<code>const x = 1;</code> and <pre>preformatted</pre>';
      const output = sanitizeHtml(input);
      expect(output).toContain('<code>const x = 1;</code>');
      expect(output).toContain('<pre>preformatted</pre>');
    });

    it('should allow blockquote and heading tags', () => {
      const input = '<blockquote>quote</blockquote> <h6>heading</h6>';
      const output = sanitizeHtml(input);
      expect(output).toContain('<blockquote>quote</blockquote>');
      expect(output).toContain('<h6>heading</h6>');
    });

    it('should allow hr and br tags', () => {
      const input = '<hr /> <br />';
      const output = sanitizeHtml(input);
      expect(output).toContain('<hr>');
      expect(output).toContain('<br>');
    });
  });

  describe('Dangerous tags filtering', () => {
    it('should remove script tags', () => {
      const input = '<p>Hello</p><script>alert("xss")</script>';
      const output = sanitizeHtml(input);
      expect(output).not.toContain('script');
      expect(output).not.toContain('alert');
    });

    it('should remove style tags', () => {
      const input = '<p>Hello</p><style>body { color: red; }</style>';
      const output = sanitizeHtml(input);
      expect(output).not.toContain('style');
      expect(output).not.toContain('color: red');
    });

    it('should remove iframe tags', () => {
      const input = '<p>Content</p><iframe src="evil.com"></iframe>';
      const output = sanitizeHtml(input);
      expect(output).not.toContain('iframe');
    });

    it('should remove form tags', () => {
      const input = '<form><input type="text" /></form>';
      const output = sanitizeHtml(input);
      expect(output).not.toContain('form');
      expect(output).not.toContain('input');
    });

    it('should remove embed and object tags', () => {
      const input = '<embed src="evil.swf" /> <object><param></object>';
      const output = sanitizeHtml(input);
      expect(output).not.toContain('embed');
      expect(output).not.toContain('object');
    });
  });

  describe('Event handler removal', () => {
    it('should remove onclick handler', () => {
      const input = '<p onclick="alert(\'xss\')">Click me</p>';
      const output = sanitizeHtml(input);
      expect(output).not.toContain('onclick');
    });

    it('should remove onmouseover handler', () => {
      const input = '<p onmouseover="alert(\'xss\')">Hover me</p>';
      const output = sanitizeHtml(input);
      expect(output).not.toContain('onmouseover');
    });

    it('should remove onerror handler', () => {
      const input = '<img src="x" onerror="alert(\'xss\')" />';
      const output = sanitizeHtml(input);
      expect(output).not.toContain('onerror');
    });
  });

  describe('Anchor tag handling', () => {
    it('should process anchor tags with rel and data-external-link attributes', () => {
      const input = '<a href="https://example.com">Link</a>';
      const output = sanitizeHtml(input);
      expect(output).toContain('<a');
      expect(output).toContain('rel="noopener noreferrer"');
      expect(output).toContain('data-external-link="true"');
      expect(output).toContain('data-href="https://example.com"');
      // href should be removed and moved to data-href
      expect(output).toContain('style="cursor: pointer;"');
    });

    it('should reject relative URLs in href', () => {
      const input = '<a href="/path/to/page">Link</a>';
      const output = sanitizeHtml(input);
      // Relative URLs don't match http: or https: protocol, so href is removed
      expect(output).toContain('<a');
      expect(output).toContain('rel="noopener noreferrer"');
      // href should not be present since it's relative
      expect(output).not.toContain('href=');
      expect(output).not.toContain('data-href');
    });

    it('should remove dangerous javascript: protocol', () => {
      const input = '<a href="javascript:alert(\'xss\')">Click</a>';
      const output = sanitizeHtml(input);
      // eslint-disable-next-line no-script-url
      expect(output).not.toContain('javascript:');
    });

    it('should remove dangerous javascript: protocol variants', () => {
      const input = '<a href="jAvAsCrIpT:alert(\'xss\')">Click</a>';
      const output = sanitizeHtml(input);
      // eslint-disable-next-line no-script-url
      expect(output).not.toContain('jAvAsCrIpT:');
    });
  });

  describe('Image tag handling', () => {
    it('should allow image tags with safe src', () => {
      const input = '<img src="https://example.com/image.png" alt="image" />';
      const output = sanitizeHtml(input);
      expect(output).toContain('<img');
      expect(output).toContain('src="https://example.com/image.png"');
      expect(output).toContain('alt="image"');
    });

    it('should add lazy loading to images', () => {
      const input = '<img src="https://example.com/image.png" />';
      const output = sanitizeHtml(input);
      expect(output).toContain('loading="lazy"');
    });

    it('should remove javascript: protocol from src', () => {
      const input = '<img src="javascript:alert(\'xss\')" />';
      const output = sanitizeHtml(input);
      // eslint-disable-next-line no-script-url
      expect(output).not.toContain('javascript:');
    });

    it('should remove javascript: protocol variants from src', () => {
      const input = '<img src="jAvAsCrIpT:alert(\'xss\')" />';
      const output = sanitizeHtml(input);
      // eslint-disable-next-line no-script-url
      expect(output).not.toContain('jAvAsCrIpT:');
    });

    it('should remove data: protocol from src', () => {
      const input = '<img src="data:text/html,<script>alert(\'xss\')</script>" />';
      const output = sanitizeHtml(input);
      // data: protocol should be removed
      expect(output).not.toContain('data:text/html');
    });
  });

  describe('Attribute filtering', () => {
    it('should remove data-* attributes', () => {
      const input = '<p data-custom="value">Text</p>';
      const output = sanitizeHtml(input);
      expect(output).not.toContain('data-custom');
    });

    it('should remove aria-* attributes', () => {
      const input = '<p aria-label="Label">Text</p>';
      const output = sanitizeHtml(input);
      expect(output).not.toContain('aria-label');
    });

    it('should remove style attribute', () => {
      const input = '<p style="color: red;">Text</p>';
      const output = sanitizeHtml(input);
      expect(output).not.toContain('style=');
    });

    it('should allow only href and src attributes', () => {
      const input = '<a href="https://example.com" title="Title" onclick="alert()">Link</a>';
      const output = sanitizeHtml(input);
      expect(output.includes('href') || output.includes('data-href')).toBe(true);
      expect(output).not.toContain('title=');
      expect(output).not.toContain('onclick');
    });
  });

  describe('Protocol validation', () => {
    it('should allow https: protocol', () => {
      const input = '<a href="https://example.com">Link</a>';
      const output = sanitizeHtml(input);
      expect(output).toContain('data-href="https://example.com"');
    });

    it('should allow http: protocol', () => {
      const input = '<a href="http://example.com">Link</a>';
      const output = sanitizeHtml(input);
      expect(output).toContain('data-href="http://example.com"');
    });

    it('should reject javascript: protocol', () => {
      const input = '<a href="javascript:void(0)">Link</a>';
      const output = sanitizeHtml(input);
      expect(output).not.toContain('href');
      expect(output).not.toContain('data-href');
    });

    it('should reject vbscript: protocol', () => {
      const input = '<a href="vbscript:msgbox(\'xss\')">Link</a>';
      const output = sanitizeHtml(input);
      expect(output).not.toContain('href');
      expect(output).not.toContain('data-href');
    });
  });

  describe('Complex scenarios', () => {
    it('should sanitize mixed valid and invalid content', () => {
      const input = `
        <p>Valid paragraph</p>
        <script>alert('xss')</script>
        <b>bold text</b>
        <img src="javascript:alert('xss')" />
        <a href="https://example.com">Link</a>
      `;
      const output = sanitizeHtml(input);
      expect(output).toContain('<p>Valid paragraph</p>');
      expect(output).toContain('<b>bold text</b>');
      expect(output).not.toContain('script');
      // eslint-disable-next-line no-script-url
      expect(output).not.toContain('javascript:');
    });

    it('should handle nested tags correctly', () => {
      const input = '<blockquote><p><strong>Important quote</strong></p></blockquote>';
      const output = sanitizeHtml(input);
      expect(output).toContain('<blockquote>');
      expect(output).toContain('<p>');
      expect(output).toContain('<strong>');
    });

    it('should strip HTML but preserve text content', () => {
      const input = '<div onclick="alert()"><span>Safe text</span></div>';
      const output = sanitizeHtml(input);
      expect(output).toContain('Safe text');
      expect(output).not.toContain('onclick');
    });

    it('should handle empty tags', () => {
      const input = '<p></p><a href="https://example.com"></a>';
      const output = sanitizeHtml(input);
      expect(output).toBeTruthy();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      const output = sanitizeHtml('');
      expect(output).toBe('');
    });

    it('should handle text without HTML', () => {
      const input = 'Just plain text with no HTML';
      const output = sanitizeHtml(input);
      expect(output).toBe(input);
    });

    it('should handle malformed HTML', () => {
      const input = '<p>Unclosed paragraph <b>bold';
      const output = sanitizeHtml(input);
      // Should handle gracefully without throwing
      expect(output).toBeTruthy();
    });

    it('should handle special characters', () => {
      const input = '<p>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</p>';
      const output = sanitizeHtml(input);
      expect(output).toContain('<p>');
      expect(output).not.toContain('<script>');
    });

    it('should handle very long content', () => {
      const longText = '<p>' + 'a'.repeat(10000) + '</p>';
      const output = sanitizeHtml(longText);
      expect(output).toContain('<p>');
      expect(output.length).toBeGreaterThan(10000);
    });
  });
});
