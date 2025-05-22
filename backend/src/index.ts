import { Hono } from "hono";
import { cors } from "hono/cors";
import { customAlphabet } from "nanoid";
import xss from "xss";

type Comment = {
  id: string;
  name?: string;
  email?: string;
  msg: string;
  pubDate: number;
};

// Type definition to make type inference
type Bindings = {
  COMMENTS: KVNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

// Rate limiting: IP address - timestamp
const lastPostTime: Record<string, number> = {};
const RATE_LIMIT_POST = 60 * 1000; // 60 seconds

const PATH_MAX_LENGTH = 100; // max length of path

// 100 IDs per Hour: ~148 years or 129M IDs needed, in order to have a 1% probability of at least one collision.
const nanoid = customAlphabet(
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

  if (path.length > PATH_MAX_LENGTH) {
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
  const ip = c.req.header("CF-Connecting-IP") || "0.0.0.0";
  const now = Date.now();

  // rate limiting
  if (lastPostTime[ip] && now - lastPostTime[ip] < RATE_LIMIT_POST) {
    // 429 Too Many Requests
    return c.text("Rate limit exceeded", 429);
  }
  lastPostTime[ip] = now;

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
    id: nanoid(),
    name: sanitize(name),
    email: sanitize(email),
    msg: sanitize(msg),
    pubDate: now,
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

export default app;
