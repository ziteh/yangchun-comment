---
title: Getting Started
---

The frontend of this comment system uses [Lit](https://lit.dev/), while the backend uses [Hono](https://hono.dev/) and is designed to run on a [Cloudflare Worker](https://workers.cloudflare.com/).

```bash
git clone https://github.com/ziteh/yangchun-comment.git
cd yangchun-comment
pnpm install
pnpm build
```

## Backend

Move into the `server` folder.

```bash
cd server
```

Create a new [KV][cf-kv] namespace, all comments data will be stored here.

```bash
pnpm exec wrangler kv namespace create "yc-comment-kv"
```

and it will return the access `binding` and `id`:

```bash
...

🌀 Creating namespace with title "yc-comment-kv"
✨ Success!
To access your new KV Namespace in your Worker, add the following snippet to your configuration file:
[[kv_namespaces]]
binding = "yc_comment_kv"
id = "506ac68ae906458692g22933d3896af3"
```

Modify the `wrangler.toml` config file and replace with actual `binding` and `id` value.

```toml "yc_comment_kv" "506ac68ae906458692g22933d3896af3"
# wrangler.toml

...

[[kv_namespaces]]
binding = "yc_comment_kv"
id = "506ac68ae906458692g22933d3896af3"

...
```

Deploy to Cloudflare Workers.

```bash
pnpm run deploy --name "yc-comment-be"
```

## Frontend

[cf-kv]: https://developers.cloudflare.com/kv/
