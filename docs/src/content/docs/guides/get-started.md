---
title: Getting Started
---

The frontend of this comment system uses [Lit](https://lit.dev/), while the backend uses [Hono](https://hono.dev/) and is designed to run on a [Cloudflare Worker](https://workers.cloudflare.com/).

✨ Feature:

- No login
- No cookie
- No fingerprinting\*

<details>
<summary>About the fingerprinting</summary>

Currently, a **hashed IP** address is used as the key for rate limiting on the backend. It offers a degree of identifiability and traceability, but it is still a little different from browser fingerprinting.

1. people on public networks (like those in cafes, companies, or libraries) may share the same IP.
2. a single person might have different IP addresses due to their ISP's dynamic IP allocation.

Therefore, an IP address cannot truly and uniquely identify a specific user.

In the future, considering using **Proof-of-Work** to prevent malicious traffic and completely avoid hashed IP.

</details>

## 1. Git Clone

```bash
git clone https://github.com/ziteh/yangchun-comment.git
cd yangchun-comment
pnpm install
pnpm build
```

## 2. Backend

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

Modify the `wrangler.toml` config file and replace with actual `id` value. If necessary, you can adjust the value of the `[vars]` area.

```toml "506ac68ae906458692g22933d3896af3"
# wrangler.toml

...

[[kv_namespaces]]
binding = "COMMENTS"
id = "506ac68ae906458692g22933d3896af3"

...

[vars]
FRONTEND_URL = "https://your-frontend-url.com"  # Frontend URL
CORS_ORIGIN = "*"          # CORS origin, use "*" to allow all origins
RSS_SITE_PATH = "site"     # The path for the all-site RSS feed
ADMIN_USERNAME = "admin"   # Admin username
MAX_MSG_LENGTH = 1000            # The max length of the comment message in characters
MAX_PSEUDONYM_LENGTH = 80        # The max length of the pseudonym in characters
MAX_ALL_SITE_RSS_COMMENTS = 25   # The max number of comments in the all-site RSS feed

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

Update [Secrets][cf-secret]. You need to set a security key for `HMAC_SECRET_KEY` and `ADMIN_SECRET_KEY`. The value should be a **strong random** string that is **long enough** (at least 32 char is recommended). You can use a tool like [this](https://jwtsecrets.com/), [this](https://djecrety.ir/) or [this](https://randomkeygen.com/) to generate a random key. Also set the admin password `ADMIN_PASSWORD`.

Use the `wrangler secret put` to set the secret, which will start the interactive operation and prompt you to enter the value.

```bash
pnpm exec wrangler secret put "HMAC_SECRET_KEY"
```

```bash
pnpm exec wrangler secret put "ADMIN_SECRET_KEY"
```

```bash
pnpm exec wrangler secret put "ADMIN_PASSWORD"
```

Once completed, you can test it by visiting `https://yangchun-comment-be.<YOUR_SUBDOMAIN>.workers.dev/rss/<RSS_SITE_PATH>`, which is an RSS feed and will return XML content. Note that the URL does **NOT** have a trailing slash.

## 3. Frontend

Install package:

```bash
# npm
npm i @ziteh/yangchun-comment-client

# pnpm
pnpm add @ziteh/yangchun-comment-client
```

Add to page:

```tsx
// React

import { useEffect, useRef } from 'react';
import '@yangchun-comment/client';
import '@yangchun-comment/client/style.css';

const API_URL = 'https://yangchun-comment-be.<YOUR_SUBDOMAIN>.workers.dev';

function App() {
  const wcRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!wcRef.current) return;

    (wcRef.current as any).apiUrl = API_URL;
    (wcRef.current as any).authorName = 'Test Author';
    (wcRef.current as any).post = '/blog/my-post';
  }, []);

  return (
    <div>
      <yangchun-comment ref={wcRef}></yangchun-comment>
    </div>
  );
}

export default App;
```

[cf-kv]: https://developers.cloudflare.com/kv/
[cf-secret]: https://developers.cloudflare.com/workers/configuration/secrets/
