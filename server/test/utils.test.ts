import { describe, it, expect } from 'vitest';
import { sanitize } from '../src/utils';

describe('sanitize', () => {
  describe('HTML Tag Removal', () => {
    it('removes all HTML tags', () => {
      const input = '<p>foo <b>bar</b>!</p>';
      const output = sanitize(input);
      expect(output).toBe('foo bar!');
    });

    it('removes nested and complex HTML tags', () => {
      const input =
        '<div class="container"><h1 style="color: red;">Title</h1><p>Content with <a href="http://example.com">link</a></p></div>';
      const output = sanitize(input);
      expect(output).toBe('TitleContent with link');
    });

    it('handles malformed or unclosed HTML tags', () => {
      const input = '<p>Unclosed paragraph <b>Bold text</p>';
      const output = sanitize(input);
      expect(output).toBe('Unclosed paragraph Bold text');
    });

    it('removes <script> tags and their content', () => {
      const input = 'foo <script>alert("XSS")</script> bar';
      const output = sanitize(input);
      expect(output).toBe('foo  bar');
    });

    it('removes <style> tags and their content', () => {
      const input = 'Text <style>body { background: red; }</style> more text';
      const output = sanitize(input);
      expect(output).toBe('Text  more text');
    });

    it('removes <iframe> tags', () => {
      const input = 'Before <iframe src="https://example.com"></iframe> After';
      const output = sanitize(input);
      expect(output).toBe('Before  After');
    });

    it('removes deeply nested and interleaved tags', () => {
      const input =
        '<div><section><p>Text <span><b>bold <i>italic</i></b></span></p></section></div>';
      const output = sanitize(input);
      expect(output).toBe('Text bold italic');
    });

    it('removes custom and unknown tags', () => {
      const input = '<custom-tag>foo</custom-tag><unknown>bar</unknown><p> baz</p>';
      const output = sanitize(input);
      expect(output).toBe('foobar baz');
    });

    it('removes SVG and MathML tags', () => {
      const input = '<svg><circle cx="50" cy="50" r="40" /></svg><math><mi>foo</mi></math>bar';
      const output = sanitize(input);
      expect(output).toBe('foobar');
    });

    it('removes HTML comments', () => {
      const input = 'foo<!-- this is a comment -->bar<!--another-->';
      const output = sanitize(input);
      expect(output).toBe('foobar');
    });

    it('removes content inside comments', () => {
      const input = '<!--><script>alert("XSS")</script>-->';
      const output = sanitize(input);
      expect(output).toBe('--&gt;');
    });

    it('removes content inside comments', () => {
      const input = '<!-- foo="bar--><script>alert("XSS")</script>" -->';
      const output = sanitize(input);
      expect(output).toBe('" --&gt;');
    });

    it('removes tags with special characters and newlines', () => {
      const input = '<div\nclass="a">line1<br/>line2</div>';
      const output = sanitize(input);
      expect(output).toBe('line1line2');
    });

    it('removes mixed tags and attributes in complex HTML', () => {
      const input =
        '<div class="x"><p id="y">A <span style="color:red">B <a href="#">C</a></span></p><!--c--></div>';
      const output = sanitize(input);
      expect(output).toBe('A B C');
    });
  });

  describe('HTML Attribute Removal', () => {
    it('removes event handler attributes from tags', () => {
      const input = '<a href="https://example.com" onclick="alert(\'XSS\')">link</a>';
      const output = sanitize(input);
      expect(output).toBe('link');
    });
  });

  describe('HTML Entities', () => {
    it('escapes HTML entities', () => {
      const input = 'Test & < > " \' / characters';
      const output = sanitize(input);
      expect(output).toBe('Test &amp; &lt; &gt; " \' / characters');
    });

    it('preserves already encoded HTML entities as text', () => {
      const input = '&lt;script&gt;alert("XSS")&lt;/script&gt;';
      const output = sanitize(input);
      expect(output).toBe(input);
    });
  });

  describe('Pseudo protocol, javascript: URLs in Markdown', () => {
    it('removes javascript: in Markdown links', () => {
      const input = '[a](javascript:alert("XSS"))';
      const output = sanitize(input);
      expect(output).toBe('[a]()');
    });

    it('removes javascript: with whitespace', () => {
      const input = '[a]( \r\n\t javascript:alert("XSS") )';
      const output = sanitize(input);
      expect(output).toBe('[a]( )');
    });

    it('removes javascript: case-insensitively', () => {
      const input = '[a](JaVaScRiPt:alert("XSS"))';
      const output = sanitize(input);
      expect(output).toBe('[a]()');
    });
  });

  describe('Markdown', () => {
    it('preserves Markdown syntax', () => {
      const input = `
# H1
## H2
### H3
#### H4
##### H5
###### H6

[link](https://example.com)
![alt](https://example.com/image.png)

*italic* or _italic_
**Bold** or __Bold__

\`inline code\`
\`\`\`c
code block
\`\`\`

- list item 1
- list item 2

1. list item 1
2. list item 2
`;
      const output = sanitize(input);
      expect(output).toBe(input);
    });

    it('removes HTML tags from markdown content', () => {
      const input = '# Title\n\n<script>alert("XSS")</script>\n\n**Bold** and *italic*';
      const output = sanitize(input);
      expect(output).toBe('# Title\n\n\n\n**Bold** and *italic*');
    });
  });

  describe('Special Cases', () => {
    it('empty string input', () => {
      const output = sanitize('');
      expect(output).toBe('');
    });

    it('null input', () => {
      const output = sanitize(null);
      expect(output).toBe('');
    });

    it('undefined input', () => {
      const output = sanitize(undefined);
      expect(output).toBe('');
    });

    it('preserves emojis in the text', () => {
      const input = 'foo 👋 bar 🌎';
      const output = sanitize(input);
      expect(output).toBe(input);
    });

    it('preserves line breaks in the text', () => {
      const input = 'Line 1\nLine 2\nLine 3';
      const output = sanitize(input);
      expect(output).toBe(input);
    });
  });
});
