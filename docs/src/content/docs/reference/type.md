---
title: Data Type
---

```ts
export interface Comment {
  /** Unique identifier for the comment */
  id: string;

  /** Pseudonym of the author */
  pseudonym?: string;

  /** Content of the comment */
  msg: string;

  /** Publish timestamp */
  pubDate: number;

  /** Last modification timestamp */
  modDate?: number;

  /** ID of the comment being replied to */
  replyTo?: string;

  /** Indicates whether the comment was made by an admin */
  isAdmin?: boolean;
}
```
