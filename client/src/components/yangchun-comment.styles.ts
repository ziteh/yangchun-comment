import { css } from 'lit';

export const yangChunCommentVars = css`
  :host {
    --ycc-primary-color: #2563eb;
    --ycc-primary-hover: #1d4ed8;
    --ycc-text-color: #1f2937;
    --ycc-text-secondary: #6b7280;
    --ycc-placeholder-color: #9ca3af;
    --ycc-bg-color: #ffffff;
    --ycc-bg-secondary: #f3f4f6;
    --ycc-border-color: #e5e7eb;
    --ycc-error-color: #ef4444;

    --ycc-spacing-xs: 4px;
    --ycc-spacing-s: 8px;
    --ycc-spacing-m: 16px;
    --ycc-spacing-l: 24px;

    --ycc-font-family: sans-serif;
    --ycc-font-monospace: ui-monospace, monospace;
    --ycc-font-size: 14px;
    --ycc-line-height: 1.5;
    --ycc-radius: 6px;
  }
`;

export const yangChunCommentStyles = css`
  :host {
    display: block;
  }

  .root {
    font-family: var(--ycc-font-family);
    color: var(--ycc-text-color);
    line-height: var(--ycc-line-height);
    font-size: var(--ycc-font-size);
  }

  button {
    background-color: var(--ycc-primary-color);
    color: white;
    border: none;
    padding: var(--ycc-spacing-s) var(--ycc-spacing-m);
    border-radius: var(--ycc-radius);
    cursor: pointer;
    font-size: var(--ycc-font-size);
    transition: background-color 0.2s;
  }
  button:hover {
    background-color: var(--ycc-primary-hover);
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  button.secondary {
    background-color: var(--ycc-border-color);
    color: var(--ycc-text-color);
  }
  button.secondary:hover {
    background-color: var(--ycc-bg-secondary);
    color: var(--ycc-text-secondary);
  }
  button.outline {
    background-color: transparent;
    color: var(--ycc-text-secondary);
    border: 1px solid var(--ycc-border-color);
  }
  button.outline:hover {
    background-color: var(--ycc-bg-secondary);
    color: var(--ycc-text-color);
  }
  button.text-btn {
    background: none;
    border: none;
    color: var(--ycc-text-secondary);
    padding: 0;
    font-size: 0.9em;
  }
  button.text-btn:hover {
    color: var(--ycc-primary-color);
    background: none;
    text-decoration: underline;
  }

  input[type='text'],
  textarea {
    width: 100%;
    padding: var(--ycc-spacing-s);
    border-radius: var(--ycc-radius);
    font-family: inherit;
    font-size: inherit;
    box-sizing: border-box; /* Important for width: 100% */
  }
  input[type='text']:focus,
  textarea:focus {
    outline: none;
    border-color: var(--ycc-primary-color);
  }
`;
