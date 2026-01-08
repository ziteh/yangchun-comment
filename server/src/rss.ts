import { Hono } from 'hono';
import { validateQueryPost, getCommentKey } from './utils';
import { CONSTANTS } from './const';
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
    MAX_THREAD_RSS_COMMENTS: number;
  };
}>();

app.get('/thread', validateQueryPost, async (c) => {
  const { post } = c.req.valid('query');
  const key = getCommentKey(post);
  const raw = await c.env.COMMENTS.get(key);
  const comments: Comment[] = raw ? JSON.parse(raw) : [];

  const siteUrl = c.env.FRONTEND_URL;
  const pageTitle = `Comments of ${post}`;
  const postUrl = new URL(post, siteUrl).href;

  let rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>${pageTitle}</title>
  <link>${postUrl}</link>
  <description>Latest comments</description>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  `;

  // Fetch the latest N comments
  comments
    .sort((a, b) => b.pubDate - a.pubDate)
    .slice(0, c.env.MAX_THREAD_RSS_COMMENTS)
    .forEach((comment) => {
      rss += `
  <item>
    <title>${comment.pseudonym || 'Anonymous'}'s Comment</title>
    <description><![CDATA[${comment.msg}]]></description>
    <pubDate>${new Date(comment.pubDate).toUTCString()}</pubDate>
    <guid>${postUrl}#comment-${comment.id}</guid>
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

// RSS feed for all site comments
app.get('/site/:site', async (c) => {
  const site = c.req.param('site');
  if (site !== c.env.RSS_SITE_PATH) {
    return c.notFound();
  }

  const siteUrl = c.env.FRONTEND_URL;
  const maxComments = c.env.MAX_ALL_SITE_RSS_COMMENTS;

  // Get all comment keys from KV
  const listResult = await c.env.COMMENTS.list({ prefix: CONSTANTS.commentsKeyPrefix });
  let latestComments: CommentWithPost[] = [];

  // Fetch comments from each key and maintain top N latest comments
  for (const key of listResult.keys) {
    const raw = await c.env.COMMENTS.get(key.name);
    if (raw === null) continue;

    const comments: Comment[] = JSON.parse(raw);
    const post = key.name.replace(CONSTANTS.commentsKeyPrefix, '');
    const commentsWithPost: CommentWithPost[] = comments.map((comment) => ({ ...comment, post }));
    latestComments.push(...commentsWithPost);

    // Sort by publication date (newest first) and keep only top N
    latestComments.sort((a, b) => b.pubDate - a.pubDate);
    if (latestComments.length > maxComments) {
      latestComments = latestComments.slice(0, maxComments);
    }
  }

  const rssItems = latestComments
    .map((comment) => {
      if (
        comment.msg === CONSTANTS.deletedMarker &&
        comment.pseudonym === CONSTANTS.deletedMarker
      ) {
        return ''; // Skip deleted comments
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

export default app;
