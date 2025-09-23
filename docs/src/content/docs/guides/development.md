---
title: Development
---

🚧 Work in progress 🚧

This project is a **monorepo** and uses [pnpm workspace](https://pnpm.io/workspaces).

## Common

```bash
git clone https://github.com/ziteh/yangchun-comment.git
cd yangchun-comment
pnpm install
pnpm build
```

## Backend

### Environment Variables

| ENV                         | Desc                                                                                         | Type    | Default Value |
| :-------------------------- | :------------------------------------------------------------------------------------------- | :------ | :-----------: |
| `FRONTEND_URL`              | The URL of your site.                                                                        | string  |      --       |
| `MAX_MSG_LENGTH`            | The max number of characters of comment message can input.                                   | integer |    `1000`     |
| `MAX_PSEUDONYM_LENGTH`      | The max number of characters of comment pseudonym can input.                                 | integer |     `60`      |
| `MAX_ALL_SITE_RSS_COMMENTS` | The max number of RSS feed comments showing.                                                 | integer |     `15`      |
| `HMAC_SECRET_KEY`           | A random string used for HMAC token generation.<br/> Select a long and strong random string. | string  |      --       |
| `ADMIN_SECRET_KEY`          | A random string used for admin login JWT.<br/> Select a long and strong random string.       | string  |      --       |
| `CORS_ORIGIN`               | The allowed origin for CORS requests.                                                        | string  |      `*`      |
| `RSS_SITE_PATH`             | RSS feed URL prefix.                                                                         | string  |    `site`     |

For production, use Cloudflare Workers Environment Variables or Secret.

Example:

```env
# .dev.vars

HMAC_SECRET_KEY=956be06a6eb1eee252e1405ce8e113c4055b5e0adce17f16
CORS_ORIGIN=*
```

```bash
cd server
pnpm dev
```

## Frontend
