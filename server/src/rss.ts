import { Hono } from 'hono';
// import { validateQueryPost, getCommentKey } from './utils';
import { DELETED_MARKER, COMMENTS_KEY_PREFIX } from './utils';
import type { Comment } from '@ziteh/yangchun-comment-shared';

interface CommentWithPost extends Comment {
  post: string;
}

const app = new Hono<{
  Bindings: {
    COMMENTS: KVNamespace;
    RSS_SITE_PATH: string;
    FRONTEND_URL: string;
    MAX_ALL_SITE_RSS_COMMENTS: number;
  };
}>();

// RSS feed for all site comments
app.get('/:site', async (c) => {
  const site = c.req.param('site');
  const expectedSite = c.env.RSS_SITE_PATH || 'site';
  if (site !== expectedSite) {
    return c.notFound();
  }

  const siteUrl = c.env.FRONTEND_URL || 'https://example.com';
  const maxComments = c.env.MAX_ALL_SITE_RSS_COMMENTS || 25;

  // Get all comment keys from KV
  const listResult = await c.env.COMMENTS.list({ prefix: COMMENTS_KEY_PREFIX });
  let latestComments: CommentWithPost[] = [];

  // Fetch comments from each key and maintain top N latest comments
  for (const key of listResult.keys) {
    const raw = await c.env.COMMENTS.get(key.name);
    if (raw === null) continue;

    const comments: Comment[] = JSON.parse(raw);
    const post = key.name.replace(COMMENTS_KEY_PREFIX, '');
    const commentsWithPost: CommentWithPost[] = comments.map((comment) => ({ ...comment, post }));
    latestComments.push(...commentsWithPost);

    // Sort by publication date (newest first) and keep only top 50
    latestComments.sort((a, b) => b.pubDate - a.pubDate);
    if (latestComments.length > maxComments) {
      latestComments = latestComments.slice(0, maxComments);
    }
  }

  const rssItems = latestComments
    .map((comment) => {
      if (comment.msg === DELETED_MARKER && comment.pseudonym === DELETED_MARKER) {
        return ''; // Skip
      }

      const title = `${comment.pseudonym || 'Anonymous'} commented on ${comment.post}`;
      const link = new URL(`${comment.post}#comment-${comment.id}`, siteUrl);

      return `<item>
  <title><![CDATA[${title}]]></title>
  <description><![CDATA[${comment.msg}]]></description>
  <link>${link.href}</link>
  <pubDate>${new Date(comment.pubDate).toUTCString()}</pubDate>
</item>`;
    })
    .join('');

  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>All Site Comments</title>
    <link>${siteUrl}</link>
    <description>Latest ${latestComments.length} comments from all posts on the site</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${rssItems}
  </channel>
</rss>`;

  return c.body(rss, 200, {
    'Content-Type': 'application/xml; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  });
});

// app.get('/thread', validateQueryPost, async (c) => {
//   const { post } = c.req.valid('query');
//   const key = getCommentKey(post);
//   const raw = await c.env.COMMENTS.get(key);
//   const comments: Comment[] = raw ? JSON.parse(raw) : [];

//   const siteUrl = 'https://example.com';
//   const pageTitle = `Comments: ${post}`;

//   let rss = `<?xml version="1.0" encoding="UTF-8" ?>
// <rss version="2.0">
// <channel>
//   <title>${pageTitle}</title>
//   <link>${siteUrl}${post}</link>
//   <description>Latest comments</description>
//   <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
//   `;

//   // Fetch the latest 20 comments
//   comments
//     .sort((a, b) => b.pubDate - a.pubDate)
//     .slice(0, 20)
//     .forEach((comment) => {
//       rss += `
//   <item>
//     <title>${comment.pseudonym || 'Anonymous'}'s Comment</title>
//     <description><![CDATA[${comment.msg}]]></description>
//     <pubDate>${new Date(comment.pubDate).toUTCString()}</pubDate>
//     <guid>${siteUrl}${post}#comment-${comment.id}</guid>
//   </item>`;
//     });

//   rss += `
// </channel>
// </rss>`;

//   return c.body(rss, 200, {
//     'Content-Type': 'application/xml; charset=utf-8',
//     'X-Content-Type-Options': 'nosniff',
//   });
// });

export default app;
