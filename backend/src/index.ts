import { Hono } from "hono";
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

// 100 IDs per Hour: ~148 years or 129M IDs needed, in order to have a 1% probability of at least one collision.
const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  10
);

app.use("*", async (c, next) => {
  await next();
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Headers", "Content-Type");
  c.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
});

app.options("*", (c) => {
  return c.text("", 204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
});

app.get("/comments", async (c) => {
  const path = c.req.query("path");
  const key = `comments:${path}`;
  const raw = await c.env.COMMENTS.get(key);
  const comments = raw ? JSON.parse(raw) : [];
  return c.json(comments);
});

app.post("/comments", async (c) => {
  console.log("post");
  const { path, name, email, msg } = await c.req.json();
  if (!path || !msg) return c.text("Missing fields", 400);

  const sanitize = (raw: string) =>
    xss(raw, {
      whiteList: {}, // empty, means filter out all HTML tags
      stripIgnoreTag: true, // filter out all HTML not in the whitelist
      stripIgnoreTagBody: ["script"], // the script tag is a special case, we need to filter out its content
    }).replace(/\]\(\s*javascript:[^)]+\)/gi, "]("); // need it ? for `[XSS](javascript:alert('xss'))`

  const comment: Comment = {
    id: nanoid(),
    name: sanitize(name),
    email: sanitize(email),
    msg: sanitize(msg),
    pubDate: Date.now(),
  };

  console.log(comment);

  const key = `comments:${path}`;
  const raw = await c.env.COMMENTS.get(key);
  const comments = raw ? JSON.parse(raw) : [];
  comments.push(comment);
  await c.env.COMMENTS.put(key, JSON.stringify(comments));
  return c.json({ ok: true });
});

app.post("/test", async (c) => {
  await c.env.COMMENTS.put("hello", "world");
  const value = await c.env.COMMENTS.get("hello");
  return c.text(`Value = ${value}`);
});

export default app;
