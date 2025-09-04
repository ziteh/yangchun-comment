import { Hono } from 'hono';
import { validateQueryPost, getCommentKey } from './utils';
import type { Comment } from '@yangchun-comment/shared';

const app = new Hono<{
  Bindings: {
    COMMENTS: KVNamespace;
  };
}>();

app.get('/thread', validateQueryPost, async (c) => {
  const { post } = c.req.valid('query');
  const key = getCommentKey(post);
  const raw = await c.env.COMMENTS.get(key);
  const comments: Comment[] = raw ? JSON.parse(raw) : [];

  const siteUrl = 'https://example.com';
  const pageTitle = `Comments: ${post}`;

  let rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>${pageTitle}</title>
  <link>${siteUrl}${post}</link>
  <description>Latest comments</description>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  `;

  // Fetch the latest 20 comments
  comments
    .sort((a, b) => b.pubDate - a.pubDate)
    .slice(0, 20)
    .forEach((comment) => {
      rss += `
  <item>
    <title>${comment.pseudonym || 'Anonymous'}'s Comment</title>
    <description><![CDATA[${comment.msg}]]></description>
    <pubDate>${new Date(comment.pubDate).toUTCString()}</pubDate>
    <guid>${siteUrl}${post}#comment-${comment.id}</guid>
  </item>`;
    });

  rss += `
</channel>
</rss>`;

  return c.body(rss, 200, {
    'Content-Type': 'application/xml; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  });
});

export default app;
