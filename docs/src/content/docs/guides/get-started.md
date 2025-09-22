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
pnpm exec wrangler kv namespace create "yangchun-comment-kv"
```

and it will return the access `id`:

```bash "506ac68ae906458692g22933d3896af3"
...

🌀 Creating namespace with title "yangchun-comment-kv"
✨ Success!
To access your new KV Namespace in your Worker, add the following snippet to your configuration file:
[[kv_namespaces]]
binding = "yangchun_comment_kv"
id = "506ac68ae906458692g22933d3896af3"
```

Modify the `wrangler.toml` config file and replace with actual `id` value.

```toml "506ac68ae906458692g22933d3896af3"
# wrangler.toml

...

[[kv_namespaces]]
binding = "COMMENTS"
id = "506ac68ae906458692g22933d3896af3"

...
```

Deploy to Cloudflare Workers.

```bash
pnpm run deploy
```

and it will return the API endpoint URL:

```bash "https://yangchun-comment-be.<YOUR_SUBDOMAIN>.workers.dev"
...

Uploaded yangchun-comment-be (3.75 sec)
Deployed yangchun-comment-be triggers (0.94 sec)
  https://yangchun-comment-be.<YOUR_SUBDOMAIN>.workers.dev
Current Version ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Update [Secrets][cf-secret]. You need to set a security key for `HMAC_SECRET_KEY` and `ADMIN_SECRET_KEY`. The value should be a **strong random** string that is **long enough** (at least 32 char is recommended). You can use a tool like [this](https://jwtsecrets.com/), [this](https://djecrety.ir/) or [this](https://randomkeygen.com/) to generate a random key.

```bash
pnpm exec wrangler secret put "HMAC_SECRET_KEY"
# You will be prompted to enter the value
```

```bash
pnpm exec wrangler secret put "ADMIN_SECRET_KEY"
# You will be prompted to enter the value
```

## Frontend

[cf-kv]: https://developers.cloudflare.com/kv/
[cf-secret]: https://developers.cloudflare.com/workers/configuration/secrets/
