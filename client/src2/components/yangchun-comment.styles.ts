import { css } from 'lit';

export const yangChunCommentStyles = css`
  :host {
    display: block;
    --ycc-color: #000000ff;
    --ycc-padding: 12px;
  }

  .root {
    padding: var(--ycc-padding);
    color: var(--ycc-color);
  }

  .reply-comments {
    margin-left: 20px;
    border-left: 2px solid var(--ycc-color);
    padding-left: 10px;
  }
`;
