---
title: Variables
---

🚧 Work in progress 🚧

## Environment Variables

| Variable                    | Type                    | Required | Description                       | Default                         |
| --------------------------- | ----------------------- | -------- | --------------------------------- | ------------------------------- |
| `FRONTEND_URL`              | string (URL)            | Yes      | Frontend website full URL         | `https://your-frontend-url.com` |
| `POST_BASE_URL`             | string (URL)            | No       | Base URL for API or post service  | `undefined`                     |
| `CORS_ORIGIN`               | string (URL)            | Yes      | Allowed CORS origin               | `http://localhost:5173`         |
| `RSS_SITE_PATH`             | string                  | Yes      | RSS site path                     | `site`                          |
| `ADMIN_USERNAME`            | string                  | Yes      | Admin login username              | `admin`                         |
| `COOKIE_SAME_SITE`          | `Strict \| Lax \| None` | Yes      | Cookie SameSite setting           | `Strict`                        |
| `ADMIN_MAX_LOGIN_ATTEMPTS`  | number                  | Yes      | Max admin login attempts          | `5`                             |
| `ADMIN_SESSION_DURATION`    | number                  | Yes      | Admin session duration (seconds)  | `3600`                          |
| `ADMIN_LOGIN_FAIL_WINDOW`   | number                  | Yes      | Login failure window (seconds)    | `3600`                          |
| `ADMIN_IP_BLOCK_DURATION`   | number                  | Yes      | IP block duration (seconds)       | `3600`                          |
| `MAX_ALL_SITE_RSS_COMMENTS` | number                  | Yes      | Max comments in site-wide RSS     | `20`                            |
| `MAX_THREAD_RSS_COMMENTS`   | number                  | Yes      | Max comments in single thread RSS | `10`                            |
| `PRE_POW_DIFFICULTY`        | number                  | Yes      | Pre-check PoW difficulty          | `2`                             |
| `PRE_POW_TIME_WINDOW`       | number                  | Yes      | Pre-check PoW time window (s)     | `60`                            |
| `PRE_POW_SALT`              | string                  | Yes      | Salt used for Pre-check PoW       | `MAGIC`                         |
| `FORMAL_POW_DIFFICULTY`     | number                  | Yes      | Formal PoW difficulty             | `4`                             |
| `FORMAL_POW_EXPIRATION`     | number                  | Yes      | Formal PoW expiration (seconds)   | `300`                           |

## Secrets

| Variable                     | Type         | Required | Description                             |
| ---------------------------- | ------------ | -------- | --------------------------------------- |
| `SECRET_ADMIN_PASSWORD_HASH` | string (Hex) | Yes      | Admin password hash (32 bytes / 64 hex) |
| `SECRET_ADMIN_PASSWORD_SALT` | string (Hex) | Yes      | Admin password salt (32 bytes / 64 hex) |
| `SECRET_ADMIN_JWT_KEY`       | string (Hex) | Yes      | Admin JWT signing key                   |
| `SECRET_COMMENT_HMAC_KEY`    | string (Hex) | Yes      | Comment HMAC verification key           |
| `SECRET_FORMAL_POW_HMAC_KEY` | string (Hex) | Yes      | HMAC key used for Formal PoW            |
| `SECRET_IP_PEPPER`           | string (Hex) | Yes      | Pepper for IP hashing                   |
| `SECRET_DISCORD_WEBHOOK_URL` | string (URL) | No       | Discord Webhook notification URL        |

## References

- [Environment variables · Cloudflare Workers docs](https://developers.cloudflare.com/workers/configuration/environment-variables/)
- [Secrets · Cloudflare Workers docs](https://developers.cloudflare.com/workers/configuration/secrets/)
