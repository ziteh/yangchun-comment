---
title: Data Type
---

🚧 Work in progress 🚧

```ts
export const CommentSchema = z.object({
  /** Unique comment identifier */
  id: z.string(),

  /** Author's display name; anonymous if omitted */
  pseudonym: z.string().optional(),

  /** The comment body text */
  msg: z.string(),

  /** Publish timestamp */
  pubDate: z.number(),

  /** Last modified timestamp, if edited or deleted */
  modDate: z.number().optional(),

  /** Parent comment ID, if this comment is a reply */
  replyTo: z.string().optional(),

  /** Flags if the author is an admin */
  isAdmin: z.boolean().optional(),
});
```
