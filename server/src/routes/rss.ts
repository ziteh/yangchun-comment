import { Hono } from 'hono';
import { CONSTANTS, HTTP_STATUS } from '../const';
import { CommentQuerySchema, type Comment } from '@ziteh/yangchun-comment-shared';
import { sValidator } from '@hono/standard-validator';
import { sanitize } from '../utils/sanitize';
import { getCommentsByPost, getAllComments } from '../utils/db';

interface CommentWithPost extends Comment {
  post: string;
}

const app = new Hono<{
  Bindings: {
    DB: D1Database;
    RSS_SITE_PATH: string;
    FRONTEND_URL: string;
    MAX_ALL_SITE_RSS_COMMENTS: number;
    MAX_THREAD_RSS_COMMENTS: number;
  };
}>();

app.get('/thread', sValidator('query', CommentQuerySchema), async (c) => {
  const { post } = c.req.valid('query');
  const comments = await getCommentsByPost(c.env.DB, post);

  const siteUrl = c.env.FRONTEND_URL;
  const pageTitle = `Comments of ${post}`;
  const postUrl = new URL(post, siteUrl).href;

  // TODO: KV caching for RSS generation?
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
    <title>${sanitize(comment.pseudonym || 'Anonymous')}'s Comment</title>
    <description><![CDATA[${sanitize(comment.msg)}]]></description>
    <pubDate>${new Date(comment.pubDate).toUTCString()}</pubDate>
    <guid>${postUrl}#comment-${comment.id}</guid>
  </item>`;
    });

  rss += `
</channel>
</rss>`;

  return c.body(rss, HTTP_STATUS.Ok, {
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

  // TODO: KV caching for RSS generation?
  const latestComments: CommentWithPost[] = await getAllComments(c.env.DB, maxComments);
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
  <title><![CDATA[${sanitize(title)}]]></title>
  <description><![CDATA[${sanitize(comment.msg)}]]></description>
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

  return c.body(rss, HTTP_STATUS.Ok, {
    'Content-Type': 'application/xml; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  });
});

export default app;
