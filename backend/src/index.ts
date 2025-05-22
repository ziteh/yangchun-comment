import { Hono } from "hono";
import { cors } from "hono/cors";
import { customAlphabet } from "nanoid";
import xss from "xss";

type Comment = {
  // Comment ID
  id: string;

  // Comment author name (optional)
  name?: string;

  // Comment author email (optional)
  email?: string;

  // Comment content
  msg: string;

  // Comment publish date timestamp
  pubDate: number;
};

type Bindings = {
  COMMENTS: KVNamespace;
  RATE_LIMITER_POST: RateLimit;
  RATE_LIMITER_GET: RateLimit;
};

const app = new Hono<{ Bindings: Bindings }>();

const MAX_PATH_LENGTH = 100; // max length of path

// 100 IDs per Hour: ~148 years or 129M IDs needed, in order to have a 1% probability of at least one collision.
const genId = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  10
);

const sanitize = (raw: string) =>
  xss(raw, {
    whiteList: {}, // empty, means filter out all HTML tags
    stripIgnoreTag: true, // filter out all HTML not in the whitelist
    stripIgnoreTagBody: ["script"], // the script tag is a special case, we need to filter out its content
  }).replace(/\]\(\s*javascript:[^)]+\)/gi, "]("); // need it ? for `[XSS](javascript:alert('xss'))`

const getKey = (path: string) => `comments:${path}`;

const validatePath = (path: any): boolean => {
  if (!path) {
    return false;
  }

  if (typeof path !== "string") {
    return false;
  }

  if (path.length > MAX_PATH_LENGTH) {
    return false;
  }

  return true; // Ok
};

// CORS middleware
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  })
);

// error handling middleware
app.onError((err, c) => {
  console.error(`${c.req.method} ${c.req.path} - Error:`, err);

  // 500 Internal Server Error
  return c.text("Internal Server Error", 500);
});

// rate limiting middleware
app.use("*", async (c, next) => {
  // TODO not recommended to use IP
  const ip = c.req.header("CF-Connecting-IP") || "0.0.0.0";
  const isPost = c.req.method === "POST";

  const limiter = isPost ? c.env.RATE_LIMITER_POST : c.env.RATE_LIMITER_GET;
  const { success } = await limiter.limit({ key: ip });

  if (!success) {
    // 429 Too Many Requests
    return c.text("Rate limit exceeded", 429);
  }

  await next();
});

app.get("/comments", async (c) => {
  const path = c.req.query("path") || "";
  if (!validatePath(path)) {
    // 400 Bad Request
    return c.text("Invalid path", 400);
  }

  const key = getKey(path);
  const raw = await c.env.COMMENTS.get(key);
  const comments = raw ? JSON.parse(raw) : [];

  // 200 OK
  return c.json(comments);
});

app.post("/comments", async (c) => {
  const { path, name, email, msg } = await c.req.json();
  if (!validatePath(path)) {
    // 400 Bad Request
    return c.text("Invalid path", 400);
  }

  if (!msg) {
    // 400 Bad Request
    return c.text("Missing fields", 400);
  }

  const comment: Comment = {
    id: genId(),
    name: sanitize(name),
    email: sanitize(email),
    msg: sanitize(msg),
    pubDate: Date.now(),
  };

  // save to KV
  const key = getKey(path);
  const raw = await c.env.COMMENTS.get(key);
  const comments = raw ? JSON.parse(raw) : [];
  comments.push(comment);
  await c.env.COMMENTS.put(key, JSON.stringify(comments));

  // 201 Created
  return c.json({ ok: true }, 201);
});

app.get("/comments/rss", async (c) => {
  const path = c.req.query("path") || "";
  if (!validatePath(path)) {
    return c.text("Invalid path", 400);
  }

  const key = getKey(path);
  const raw = await c.env.COMMENTS.get(key);
  const comments: Comment[] = raw ? JSON.parse(raw) : [];

  const siteUrl = "https://example.com";
  const pageTitle = `Comments: ${path}`;

  let rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>${pageTitle}</title>
  <link>${siteUrl}${path}</link>
  <description>Latest comments</description>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  `;

  // fetch the latest 20 comments
  comments
    .sort((a, b) => b.pubDate - a.pubDate)
    .slice(0, 20)
    .forEach((comment) => {
      rss += `
  <item>
    <title>${comment.name || "Anonymous"}'s Comment</title>
    <description><![CDATA[${comment.msg}]]></description>
    <pubDate>${new Date(comment.pubDate).toUTCString()}</pubDate>
    <guid>${siteUrl}${path}#comment-${comment.id}</guid>
  </item>`;
    });

  rss += `
</channel>
</rss>`;

  return c.body(rss, 200, {
    "Content-Type": "application/xml; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
});

export default app;
