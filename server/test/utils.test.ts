import { describe, it, expect } from 'vitest';
import Utils from '../src/utils';

describe('Utils', () => {
  describe('HTML sanitize', () => {
    it('should remove all HTML tags', () => {
      const input = '<p>Hello <b>World</b>!</p>';
      const output = Utils.sanitize(input);
      expect(output).toBe('Hello World!');
    });

    it('should handle empty string', () => {
      const input = '';
      const output = Utils.sanitize(input);
      expect(output).toBe('');
    });

    it('should handle null input', () => {
      // @ts-ignore - Testing incorrect input
      const output = Utils.sanitize(null);
      expect(output).toBe('');
    });

    it('should remove script tags', () => {
      const input = 'Hello <script>alert("XSS")</script> World';
      const output = Utils.sanitize(input);
      expect(output).toBe('Hello  World');
    });

    it('should remove complex HTML', () => {
      const input =
        '<div class="container"><h1 style="color: red;">Title</h1><p>Content with <a href="http://example.com">link</a></p></div>';
      const output = Utils.sanitize(input);
      expect(output).toBe('TitleContent with link');
    });

    it('should escape HTML entities', () => {
      const input = 'Test & < > " \' / characters';
      const output = Utils.sanitize(input);
      expect(output).toBe(`Test &amp; &lt; &gt; " ' / characters`);
    });

    it('should remove javascript: URLs', () => {
      const input = '[Click me](javascript:alert("XSS"))';
      const output = Utils.sanitize(input);
      expect(output).toBe('[Click me]()');
    });

    it('should remove javascript: URLs with spaces', () => {
      const input = '[Click me]( javascript:alert("XSS") )';
      const output = Utils.sanitize(input);
      expect(output).toBe('[Click me]( )');
    });

    it('should remove HTML from markdown', () => {
      const input = '# Title\n\n<script>alert("XSS")</script>\n\n**Bold** and *italic*';
      const output = Utils.sanitize(input);
      expect(output).toBe('# Title\n\n\n\n**Bold** and *italic*');
    });

    it('should handle malformed HTML', () => {
      const input = '<p>Unclosed paragraph <b>Bold text</p>';
      const output = Utils.sanitize(input);
      expect(output).toBe('Unclosed paragraph Bold text');
    });

    it('should remove iframe tags', () => {
      const input = 'Before <iframe src="https://example.com"></iframe> After';
      const output = Utils.sanitize(input);
      expect(output).toBe('Before  After');
    });

    it('should remove event handlers', () => {
      const input = '<a href="https://example.com" onclick="alert(\'XSS\')">Click me</a>';
      const output = Utils.sanitize(input);
      expect(output).toBe('Click me');
    });

    it('should remove style tags', () => {
      const input = 'Text <style>body { background: red; }</style> more text';
      const output = Utils.sanitize(input);
      expect(output).toBe('Text  more text');
    });

    it('should decode HTML entities', () => {
      const input = 'Copyright &copy; 2025 &amp; beyond';
      const output = Utils.sanitize(input);
      expect(output).toBe('Copyright © 2025 &amp; beyond');
    });

    it('should keep encoded entities as text', () => {
      const input = '&lt;script&gt;alert("XSS")&lt;/script&gt;';
      const output = Utils.sanitize(input);
      expect(output).toBe('&lt;script&gt;alert("XSS")&lt;/script&gt;');
    });

    it('should preserve emojis', () => {
      const input = 'Hello 👋 World! 🌎';
      const output = Utils.sanitize(input);
      expect(output).toBe('Hello 👋 World! 🌎');
    });

    it('should preserve line breaks', () => {
      const input = 'Line 1\nLine 2\nLine 3';
      const output = Utils.sanitize(input);
      expect(output).toBe('Line 1\nLine 2\nLine 3');
    });
  });
});
